import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export default function AssetAdminPreview({ url }: { url: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      setStatus('error');
      return;
    }
    let active = true;
    let model: THREE.Object3D | undefined;
    let frame = 0;
    setStatus('loading');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.001, 2500);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    scene.add(new THREE.HemisphereLight(0xe8efff, 0x54627c, 2.6));
    const key = new THREE.DirectionalLight(0xffe4be, 3);
    key.position.set(4, 6, 3);
    scene.add(key);
    const resize = new ResizeObserver(() => {
      camera.aspect = Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    });
    resize.observe(host);
    const dispose = (object: THREE.Object3D) => {
      object.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        node.geometry.dispose();
        for (const material of [node.material].flat()) {
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) value.dispose();
          }
          material.dispose();
        }
      });
    };

    void new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url).then((gltf) => {
      if (!active) { dispose(gltf.scene); return; }
      model = gltf.scene;
      scene.add(model);
      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3()).length();
      if (!Number.isFinite(size) || size <= 0) throw new Error('Invalid model bounds');
      model.position.sub(center);
      camera.position.set(size * 0.85, size * 0.5, size * 1.15);
      camera.near = size / 150;
      camera.far = size * 50;
      camera.updateProjectionMatrix();
      controls.minDistance = size / 8;
      controls.maxDistance = size * 4;
      setStatus('ready');
      const render = () => {
        controls.update();
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      };
      render();
    }).catch(() => { if (active) setStatus('error'); });

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.dispose();
      if (model) dispose(model);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [url]);

  return (
    <div className="relative h-80 overflow-hidden rounded-xl bg-slate-950/80">
      <div ref={container} className="absolute inset-0" />
      {status !== 'ready' && (
        <p role="status" className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-slate-300">
          {status === 'loading' ? 'Đang mở model 3D…' : 'Không thể xem model 3D trên trình duyệt này.'}
        </p>
      )}
    </div>
  );
}
