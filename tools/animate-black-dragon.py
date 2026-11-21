"""Bake Hắc Long keyframes with Blender mathutils without re-encoding its textures/skin.

blender --background --threads 2 --python-exit-code 1 --python tools/animate-black-dragon.py -- INPUT.glb OUTPUT.glb
"""
import json
import math
from pathlib import Path
import struct
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector

source, target = map(Path, sys.argv[sys.argv.index('--') + 1:])
raw = source.read_bytes()
magic, version, _, json_size, json_type = struct.unpack_from('<4sIIII', raw)
assert (magic, version, json_type) == (b'glTF', 2, 0x4E4F534A)
doc = json.loads(raw[20:20 + json_size])
data = bytearray(raw[28 + json_size:])
nodes = doc['nodes']
indices = {node.get('name'): i for i, node in enumerate(nodes)}
parents = {child: i for i, node in enumerate(nodes) for child in node.get('children', [])}
animations = doc['animations']
names = ('Walk', 'Sprint', 'WingFlare')
assert not any(clip['name'] in names for clip in animations), 'Use the original idle-only asset (Git a5e3af6).'
idle = next(clip for clip in animations if clip['name'] == 'Scene')


def first_value(accessor, width):
    a = doc['accessors'][accessor]
    v = doc['bufferViews'][a['bufferView']]
    assert a['componentType'] == 5126 and 'sparse' not in a
    return struct.unpack_from('<' + 'f' * width, data, v.get('byteOffset', 0) + a.get('byteOffset', 0))


rest = {}
for channel in idle['channels']:
    pos = channel['target']
    attr = pos['path']
    if attr in ('rotation', 'translation', 'scale'):
        rest[pos['node'], attr] = first_value(idle['samplers'][channel['sampler']]['output'], 4 if attr == 'rotation' else 3)


def base(i, attr, default):
    return rest.get((i, attr), nodes[i].get(attr, default))


def rotation(i):
    x, y, z, w = base(i, 'rotation', (0, 0, 0, 1))
    return Quaternion((w, x, y, z)).normalized()


worlds = {}


def world(i):
    if i not in worlds:
        m = Matrix.LocRotScale(Vector(base(i, 'translation', (0, 0, 0))), rotation(i), Vector(base(i, 'scale', (1, 1, 1))))
        worlds[i] = world(parents[i]) @ m if i in parents else m
    return worlds[i]


def accessor(rows, width):
    values = [value for row in rows for value in row]
    doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(data), 'byteLength': 4 * len(values)})
    data.extend(struct.pack(f'<{len(values)}f', *values))
    item = {'bufferView': len(doc['bufferViews']) - 1, 'componentType': 5126, 'count': len(rows), 'type': {1: 'SCALAR', 3: 'VEC3', 4: 'VEC4'}[width]}
    if width == 1:
        item.update(min=[values[0]], max=[values[-1]])
    doc['accessors'].append(item)
    return len(doc['accessors']) - 1


LEGS = (
    ('upper_arm_L_052', 'ik_underarm_L_053', 'Hand_L_0133', 0.0),
    ('upper_arm_R_054', 'ik_underarm_R_055', 'Hand_R_099', .5),
    ('Oberschenkel_L_08', 'lowerleg_L_09', 'back_food_L_082', .5),
    ('Oberschenkel_R_012', 'lowerleg_R_013', 'back_food_R_0116', 0.0),
)
WINGS = (('w_C_L_057', 'w2_L_059', 1), ('w_C_R_069', 'w2_R_071', -1))


def bake(name, duration, strong=0):
    # Animations are in-place in the glTF +Y-up/+Z-forward basis.
    cell = {'name': name, 'channels': [], 'samplers': []}
    count = round(duration * 30)
    times = accessor([(duration * n / count,) for n in range(count + 1)], 1)
    tracks = {}
    for frame in range(count + 1):
        t = (frame % count) / count
        angle = math.tau * t

        def add(bone, attr, value):
            tracks.setdefault((indices[bone], attr), []).append(tuple(value))

        def turn(bone, axis, radians):
            i = indices[bone]
            basis = world(i).to_quaternion()
            q = rotation(i) @ Quaternion(basis.inverted() @ Vector(axis), radians)
            add(bone, 'rotation', (q.x, q.y, q.z, q.w))

        def move(bone, offset):
            i = indices[bone]
            change = world(parents[i]).to_3x3().inverted() @ Vector(offset)
            add(bone, 'translation', Vector(base(i, 'translation', (0, 0, 0))) + change)

        pitch, yaw, roll = (1, 0, 0), (0, 1, 0), (0, 0, 1)
        if name == 'WingFlare':
            rise = math.sin(math.pi * t) ** 2
            pulse = rise * (0.82 + .18 * math.cos(angle * 2))
            for wing, tip, side in WINGS:
                turn(wing, roll, side * .49 * pulse)
                turn(tip, roll, side * .16 * rise)
            turn('breast_018', pitch, -.18 * rise)
            turn('ACT_neck_3_019', pitch, -.20 * rise)
            turn('head_022', pitch, -.23 * rise)
            turn('Bone_024', pitch, .32 * pulse)
            turn('tail_1_04', pitch, .12 * rise)
            turn('tail_2_05', yaw, .15 * rise * math.sin(angle))
        else:
            for upper, lower, foot, offset in LEGS:
                p = (t + offset) % 1
                wave = math.sin(math.tau * p)
                lift = max(0, math.cos(math.tau * p))
                front = foot.startswith('Hand')
                turn(upper, pitch, -wave * (.24 + .26 * strong))
                turn(lower, pitch, (-1 if front else 1) * lift * (.33 + .30 * strong))
                move(foot, (0, lift * (.32 + .46 * strong), wave * (.62 + .65 * strong)))
            turn('breast_018', pitch, .035 * math.sin(2 * angle))
            turn('head_022', pitch, .075 * math.sin(2 * angle - .6))
            turn('tail_1_04', yaw, .10 * math.sin(angle - .7))
            turn('tail_2_05', yaw, .13 * math.sin(angle - 1.3))
            turn('tail_3_06', yaw, .18 * math.sin(angle - 1.9))
            for wing, tip, side in WINGS:
                turn(wing, roll, side * (.075 + .13 * strong) * math.sin(2 * angle - .3))
                turn(tip, roll, side * .10 * math.sin(2 * angle - 1))
    endpoints = accessor([(0,), (duration,)], 1)
    for key, value in rest.items():
        if key not in tracks:
            tracks[key] = [value, value]
    for (i, path), rows in tracks.items():
        output = accessor(rows, len(rows[0]))
        cell['channels'].append({'sampler': len(cell['samplers']), 'target': {'node': i, 'path': path}})
        cell['samplers'].append({'input': endpoints if len(rows) == 2 else times, 'output': output, 'interpolation': 'LINEAR'})
    return cell


doc['animations'] = animations + [bake('Walk', 1.0), bake('Sprint', .6, 1), bake('WingFlare', 1.6)]
doc['asset']['extras']['animationChanges'] = 'Walk, Sprint, and WingFlare baked in Blender; original Scene idle retained.'
doc['buffers'][0]['byteLength'] = len(data)
encoded = json.dumps(doc, separators=(',', ':')).encode()
encoded += b' ' * (-len(encoded) % 4)
assert source.resolve() != target.resolve(), 'Export to a separate file before replacing the runtime asset'
with target.open('wb') as f:
    f.write(struct.pack('<4sIIII', b'glTF', 2, 28 + len(encoded) + len(data), len(encoded), 0x4E4F534A))
    f.write(encoded)
    f.write(struct.pack('<II', len(data), 0x004E4942))
    f.write(data)
print(f'{bpy.app.version_string}: {target} ' + ', '.join(f'{clip["name"]}:{len(clip["channels"])}' for clip in doc['animations']))
