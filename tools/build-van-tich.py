"""Rig the supplied Vân Tịch GLB and rebuild the game's model.

Run with Blender 4.x:
    blender -b --python tools/build-van-tich.py -- /path/to/Lisa.glb
"""

import math
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector


def smoothstep(start, end, value):
    factor = max(0.0, min(1.0, (value - start) / (end - start)))
    return factor * factor * (3.0 - 2.0 * factor)


def skin_weights(co):
    """Blend around each joint without letting a limb pull on its neighbor."""
    x, _, z = co
    side = 'R' if x > 0 else 'L'
    across = abs(x)

    shoulder = smoothstep(.089, .146, across) * smoothstep(.716, .763, z)
    if shoulder > 0:
        elbow = smoothstep(.243, .307, across)
        wrist = smoothstep(.368, .405, across)
        return {
            'Torso': 1 - shoulder,
            'UpperArm' + side: shoulder * (1 - elbow),
            'Forearm' + side: shoulder * elbow * (1 - wrist),
            'Grip' + side: shoulder * elbow * wrist,
        }

    hip = 1 - smoothstep(.41, .57, z)
    knee = 1 - smoothstep(.213, .293, z)
    if hip > 0:
        return {
            'Torso': 1 - hip,
            'Thigh' + side: hip * (1 - knee),
            'Shin' + side: hip * knee,
        }

    return {'Torso': 1}


def add_bone(armature, name, head, tail, parent=None):
    bone = armature.edit_bones.new(name)
    bone.head = head
    bone.tail = tail
    if parent:
        bone.parent = armature.edit_bones[parent]


def apply_relaxed_bind_pose(mesh, rig, modifier):
    # Lower the arms in the bind pose so the game's runtime rotations start
    # from a relaxed stance and the hands can still carry the staff.
    for suffix, direction in (('L', -1), ('R', 1)):
        upper = rig.pose.bones['UpperArm' + suffix]
        forearm = rig.pose.bones['Forearm' + suffix]
        upper_axis = upper.bone.matrix_local.to_3x3().inverted() @ Vector((0, 1, 0))
        lower_axis = forearm.bone.matrix_local.to_3x3().inverted() @ Vector((0, 0, 1))
        upper.rotation_quaternion = Quaternion(upper_axis, direction * math.radians(74))
        forearm.rotation_quaternion = Quaternion(lower_axis, -direction * math.radians(18))

    bpy.context.view_layer.update()
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.armature_apply()
    bpy.ops.object.mode_set(mode='OBJECT')
    mesh.modifiers.new('Vân Tịch skin', 'ARMATURE').object = rig


def build(source):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    mesh, = (obj for obj in bpy.context.scene.objects if obj.type == 'MESH')
    matrix = mesh.matrix_world.copy()
    mesh.parent = None
    mesh.matrix_world = matrix
    mesh.name = 'Vân Tịch'

    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    floor = min(vertex.co.z for vertex in mesh.data.vertices)
    height = max(vertex.co.z for vertex in mesh.data.vertices) - floor
    for vertex in mesh.data.vertices:
        vertex.co = (vertex.co - Vector((0, 0, floor))) / height

    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.000001)
    bpy.ops.object.mode_set(mode='OBJECT')
    for face in mesh.data.polygons:
        face.use_smooth = True

    for material in mesh.data.materials:
        shader = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
        metallic = shader.inputs['Metallic']
        for link in list(metallic.links):
            material.node_tree.links.remove(link)
        metallic.default_value = 0
        shader.inputs['Roughness'].default_value = .85

    armature = bpy.data.armatures.new('Vân Tịch skeleton')
    rig = bpy.data.objects.new('VanTichRig', armature)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')

    add_bone(armature, 'Torso', (0, .018, .50), (0, .016, .80))
    for side, sign in (('L', -1), ('R', 1)):
        shoulder = (sign * .110, .025, .800)
        elbow = (sign * .276, .021, .795)
        wrist = (sign * .388, .012, .792)
        hand = (sign * .446, .009, .792)
        hip = (sign * .062, .020, .505)
        knee = (sign * .063, .011, .252)
        ankle = (sign * .061, .032, .055)
        add_bone(armature, 'UpperArm' + side, shoulder, elbow, 'Torso')
        add_bone(armature, 'Forearm' + side, elbow, wrist, 'UpperArm' + side)
        add_bone(armature, 'Grip' + side, wrist, hand, 'Forearm' + side)
        add_bone(armature, 'Thigh' + side, hip, knee, 'Torso')
        add_bone(armature, 'Shin' + side, knee, ankle, 'Thigh' + side)

    # The weapon anchor belongs inside the palm, beyond the wrist joint.
    for side, sign in (('L', -1), ('R', 1)):
        add_bone(armature, 'Palm' + side, (sign * .432, .009, .792),
                 (sign * .452, .009, .792), 'Grip' + side)
    bpy.ops.object.mode_set(mode='OBJECT')

    groups = {bone.name: mesh.vertex_groups.new(name=bone.name) for bone in armature.bones
              if not bone.name.startswith('Palm')}
    for vertex in mesh.data.vertices:
        for name, weight in skin_weights(vertex.co).items():
            if weight > 0:
                groups[name].add([vertex.index], weight, 'REPLACE')

    mesh.parent = rig
    modifier = mesh.modifiers.new('Vân Tịch skin', 'ARMATURE')
    modifier.object = rig
    apply_relaxed_bind_pose(mesh, rig, modifier)

    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    rig.select_set(True)
    output = Path(__file__).resolve().parents[1] / 'public/assets/heroes/van-tich.glb'
    bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB',
                              use_selection=True, export_animations=False)


if __name__ == '__main__':
    paths = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if len(paths) != 1:
        raise SystemExit('Pass a single source GLB path after --.')
    build(Path(paths[0]).resolve())
