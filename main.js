import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import getStarfield from "./getStarfield";

const canvas = document.getElementById('canvas')
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 0, 3.5)

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// pixel ratio
renderer.setPixelRatio(window.devicePixelRatio)

// raycaster
const raycaster = new THREE.Raycaster()
const mousePositiion = new THREE.Vector2()
const globeUv = new THREE.Vector2()

// Texture
const textureLoader = new THREE.TextureLoader()
const starLoader = textureLoader.load('./circle.png')
const colorMap = textureLoader.load('./00_earthmap1k.jpg')
const elevMap = textureLoader.load('./01_earthbump1k.jpg')
const alphaMap = textureLoader.load('./02_earthspec1k.jpg')
const rainbowColorMap = textureLoader.load('./04_rainbow1k.jpg')

// star
const star = getStarfield({
  numStars: 5000,
  sprite: starLoader
})
scene.add(star)

// Shader
const vertexShader = `
  uniform float size;
  uniform sampler2D elevTexture;
  uniform vec2 mouseUv;

  varying vec2 vUv;
  varying float vVisible;
  varying float vDist;
  varying float vThresh;

  void main() {
    float thresh = 0.04;
    vThresh = thresh;
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float elv = texture2D(elevTexture, vUv).r;
    vec3 vNormal = normalMatrix * normal;
    vVisible = step(0.0, dot( -normalize(mvPosition.xyz), normalize(vNormal)));
    mvPosition.z += 0.1 * elv;
    float dist = distance(mouseUv, vUv);
    float zDist = 0.0;
    if (dist < thresh) {
      zDist = (thresh - dist) * 4.0;
    }
    vDist = dist;
    mvPosition.z += zDist;
    gl_PointSize = size;
    gl_Position = projectionMatrix * mvPosition;
  }
`
const fragmentShader = `
  uniform sampler2D colorTexture;
  uniform sampler2D alphaTexture;
  uniform sampler2D rainbowColorTexture;

  varying vec2 vUv;
  varying float vVisible;
  varying float vDist;
  varying float vThresh;

  void main() {
    if (floor(vVisible + 0.1) == 0.0) discard;
    float alpha = texture2D(alphaTexture, vUv).r;
    vec3 color = texture2D(colorTexture, vUv).rgb;
    vec3 rainbowColor = texture2D(rainbowColorTexture, vUv).rgb;
    if (vDist < vThresh) {
      color = mix(color, rainbowColor, (vThresh - vDist) * 40.0);
    }
    gl_FragColor = vec4(color, alpha);
  }
`

const uniforms = {
  size: { 
    type: "f", 
    value: 4.0 
  },
  colorTexture: {
    type: "t",
    value: colorMap
  },
  rainbowColorTexture: {
    type: "t",
    value: rainbowColorMap
  },
  elevTexture: {
    type: "t",
    value: elevMap
  },
  alphaMap: {
    type: "t",
    value: alphaMap
  },
  mouseUv: {
    type: "v2",
    value: new THREE.Vector2(0.0, 0.0)
  } 
}

const detail = 120

const globeGroup = new THREE.Group()
scene.add(globeGroup)

const globeGeometry = new THREE.IcosahedronGeometry(1, 10)
const globeMaterial = new THREE.MeshBasicMaterial({
  color: 0x202020,
  wireframe: true,
})

const globe = new THREE.Mesh(globeGeometry, globeMaterial)
globeGroup.add(globe)

const globePointsMaterial = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  transparent: true,
})

const globePointGeometry = new THREE.IcosahedronGeometry(1, detail)
const globePoint = new THREE.Points(globePointGeometry, globePointsMaterial)
globeGroup.add(globePoint)


// light
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x080820, 10)
scene.add(hemisphereLight)


// controls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

function handleRaycast() {
  raycaster.setFromCamera(mousePositiion, camera)
  const intersects = raycaster.intersectObjects([globe], false)
  if (intersects.length > 0) {
    globeUv.copy(intersects[0].uv)
  }
  uniforms.mouseUv.value = globeUv
}
function animate() {
  renderer.render(scene, camera)
  globeGroup.rotation.y += 0.002
  handleRaycast()
  requestAnimationFrame(animate)
  controls.update()
}
animate()

window.addEventListener('mousemove', (event) => {
  mousePositiion.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1)
})
