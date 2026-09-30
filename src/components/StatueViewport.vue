<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Voxel } from '../domain/voxel-model'
import { useStatueStore } from '../stores/statue'

const store = useStatueStore()
const viewport = ref<HTMLDivElement | null>(null)
let renderer: THREE.WebGLRenderer | undefined
let scene: THREE.Scene | undefined
let camera: THREE.PerspectiveCamera | undefined
let controls: OrbitControls | undefined
let voxelGroup: THREE.Group | undefined
let resizeRenderer: (() => void) | undefined
const geometry = new THREE.BoxGeometry(0.94, 0.94, 0.94)

function isStainedGlass(voxel: Voxel): boolean {
  return voxel.block.endsWith('_stained_glass')
}

function rebuild() {
  if (!scene) return
  if (voxelGroup) {
    scene.remove(voxelGroup)
    voxelGroup.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.material.dispose()
    })
  }

  voxelGroup = new THREE.Group()
  const batches = new Map<string, { color: string; transparent: boolean; voxels: Voxel[] }>()
  for (const voxel of store.voxels.values()) {
    const transparent = isStainedGlass(voxel)
    const key = `${voxel.color}:${transparent}`
    const batch = batches.get(key) ?? { color: voxel.color, transparent, voxels: [] }
    batch.voxels.push(voxel)
    batches.set(key, batch)
  }

  const matrix = new THREE.Matrix4()
  for (const { color, transparent, voxels } of batches.values()) {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: transparent ? 0.24 : 0.82,
      metalness: 0,
      transparent,
      opacity: transparent ? 0.46 : 1,
      depthWrite: !transparent,
    })
    const mesh = new THREE.InstancedMesh(geometry, material, voxels.length)
    voxels.forEach((voxel, index) => {
      matrix.makeTranslation(voxel.x, voxel.y, voxel.z)
      mesh.setMatrixAt(index, matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    voxelGroup.add(mesh)
  }

  scene.add(voxelGroup)
}

onMounted(() => {
  const host = viewport.value
  if (!host) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color('#f5f7fa')

  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120)
  camera.position.set(40, 31, 58)

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  host.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(7.5, 15, 3.5)
  controls.enableDamping = true
  controls.minDistance = 22
  controls.maxDistance = 76

  scene.add(new THREE.HemisphereLight('#ffffff', '#cbd5e1', 2.4))
  const keyLight = new THREE.DirectionalLight('#ffffff', 3.2)
  keyLight.position.set(18, 35, 28)
  scene.add(keyLight)

  const grid = new THREE.GridHelper(64, 64, '#94a3b8', '#e2e8f0')
  grid.position.set(7.5, -1.1, 3.5)
  scene.add(grid)

  resizeRenderer = () => {
    if (!renderer || !camera) return
    const { width, height } = host.getBoundingClientRect()
    renderer.setSize(width, height, false)
    camera.aspect = width / Math.max(height, 1)
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', resizeRenderer)
  resizeRenderer()

  rebuild()
  renderer.setAnimationLoop(() => {
    controls?.update()
    if (scene && camera) renderer?.render(scene, camera)
  })
})

watch(() => store.voxels, rebuild)

onBeforeUnmount(() => {
  if (resizeRenderer) window.removeEventListener('resize', resizeRenderer)
  renderer?.setAnimationLoop(null)
  controls?.dispose()
  renderer?.dispose()
  geometry.dispose()
})
</script>

<template>
  <section class="viewport-shell">
    <div class="viewport-bar">
      <div>
        <span class="live-dot"></span>
        Live block preview
      </div>
      <span>Drag to orbit · Wheel to zoom</span>
    </div>
    <div ref="viewport" class="viewport"></div>
    <div v-if="store.error" class="error-banner" role="alert">{{ store.error }}</div>
  </section>
</template>
