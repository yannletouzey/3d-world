import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import getStarfield from "./getStarfield";

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 0, 3.5)

const renderer = new THREE.WebGLRenderer({
  antialias: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// pixel ratio
renderer.setPixelRatio(window.devicePixelRatio)

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

  varying vec2 vUv;
  varying float vVisible;

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float elv = texture2D(elevTexture, vUv).r;
    vec3 vNormal = normalMatrix * normal;
    vVisible = step(0.0, dot( -normalize(mvPosition.xyz), normalize(vNormal)));
    mvPosition.z += 0.35 * elv;
    gl_PointSize = size;
    gl_Position = projectionMatrix * mvPosition;
  }
`
const fragmentShader = `
  uniform sampler2D colorTexture;
  uniform sampler2D alphaTexture;

  varying vec2 vUv;
  varying float vVisible;

  void main() {
    if (floor(vVisible + 0.1) == 0.0) discard;
    float alpha = texture2D(alphaTexture, vUv).r;
    vec3 color = texture2D(colorTexture, vUv).rgb;
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
  elevTexture: {
    type: "t",
    value: elevMap
  },
  alphaMap: {
    type: "t",
    value: alphaMap
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
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x080820, 3)
scene.add(hemisphereLight)


// controls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

function animate() {
  globeGroup.rotation.y += 0.002
  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}

animate()
