import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'

export default function Game(){
  const mountRef = useRef(null)

  useEffect(()=>{
    const width = Math.min(window.innerWidth, 800)
    const height = Math.min(window.innerHeight, 600)
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x000011, 0.02)
    const camera = new THREE.PerspectiveCamera(60, width/height, 0.1, 1000)
    camera.position.set(0, 2, 6)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    mountRef.current.appendChild(renderer.domElement)

    // ambient bg
    const hemi = new THREE.HemisphereLight(0xaaaaee, 0x202040, 0.8)
    scene.add(hemi)
    const dir = new THREE.DirectionalLight(0xffffff, 0.6)
    dir.position.set(5,10,7)
    scene.add(dir)

    // player (ship)
    const ship = new THREE.Group()
    const bodyGeo = new THREE.ConeGeometry(0.35, 1, 8)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x7ee7d1, metalness: 0.3, roughness: 0.4 })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.rotation.x = Math.PI * 0.5
    ship.add(body)
    ship.position.set(0, 0.5, 0)
    scene.add(ship)

    // ground grid (invisible, for reference)
    const grid = new THREE.GridHelper(20, 20, 0x111122, 0x080810)
    grid.position.y = -1
    scene.add(grid)

    // objects arrays
    const crystals = []
    const meteors = []

    // spawn helpers
    function spawnCrystal(){
      const geo = new THREE.OctahedronGeometry(0.25)
      const mat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive:0x553300, metalness:0.2 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set((Math.random()-0.5)*6, (Math.random()*2)-0.5, -20 - Math.random()*10)
      scene.add(mesh)
      crystals.push(mesh)
    }
    function spawnMeteor(){
      const geo = new THREE.IcosahedronGeometry(0.5,0)
      const mat = new THREE.MeshStandardMaterial({ color: 0x6b6b6b })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set((Math.random()-0.5)*8, (Math.random()*3)-1, -25 - Math.random()*20)
      mesh.userData.speed = 0.07 + Math.random()*0.08
      scene.add(mesh)
      meteors.push(mesh)
    }

    // initial spawn
    for(let i=0;i<6;i++) spawnCrystal()
    for(let i=0;i<4;i++) spawnMeteor()

    // input controls (mouse/touch)
    const pointer = { x:0, y:0 }
    function onMove(e){
      const x = e.touches ? e.touches[0].clientX : e.clientX
      const y = e.touches ? e.touches[0].clientY : e.clientY
      const nx = (x / window.innerWidth) * 2 - 1
      const ny = -(y / window.innerHeight) * 2 + 1
      pointer.x = nx * 4 // scale to scene coords
      pointer.y = ny * 1.5 + 0.5
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onMove, {passive:true})

    // score
    let score = Number(localStorage.getItem('coletor_score') || 0)
    function updateHUD(){
      localStorage.setItem('coletor_score', String(score))
      window.dispatchEvent(new CustomEvent('coletor:updateScore', { detail: { score } }))
    }
    updateHUD()

    // helper function for collision (bounding sphere)
    function checkCollision(a, b, r=0.5){
      const dx = a.position.x - b.position.x
      const dy = a.position.y - b.position.y
      const dz = a.position.z - b.position.z
      return (dx*dx+dy*dy+dz*dz) < (r*r)
    }

    // game loop
    let frameId
    let tick = 0
    function animate(){
      tick += 1
      // move ship toward pointer smoothly
      ship.position.x += (pointer.x - ship.position.x) * 0.08
      ship.position.y += (pointer.y - ship.position.y) * 0.06
      ship.rotation.z = (pointer.x - ship.position.x) * -0.3

      // move objects forward (toward camera)
      for(let i=crystals.length-1;i>=0;i--){
        const c = crystals[i]
        c.position.z += 0.15
        c.rotation.x += 0.05
        c.rotation.y += 0.03
        if(c.position.z > 2){
          // missed, remove and respawn
          scene.remove(c); crystals.splice(i,1); spawnCrystal()
        } else if(checkCollision(c, ship, 0.7)){
          // collect
          scene.remove(c); crystals.splice(i,1)
          score += 10
          updateHUD()
          spawnCrystal()
        }
      }
      for(let i=meteors.length-1;i>=0;i--){
        const m = meteors[i]
        m.position.z += m.userData.speed
        m.rotation.x += 0.04
        m.rotation.y += 0.02
        if(m.position.z > 3){
          scene.remove(m); meteors.splice(i,1); spawnMeteor()
        } else if(checkCollision(m, ship, 0.9)){
          // collision -> penalty
          scene.remove(m); meteors.splice(i,1)
          score = Math.max(0, score - 20)
          updateHUD()
          spawnMeteor()
        }
      }

      // occasional spawn
      if(Math.random() < 0.02) spawnCrystal()
      if(Math.random() < 0.01) spawnMeteor()

      // gentle camera movement
      camera.position.z = 6 - Math.sin(tick*0.002) * 0.3
      camera.lookAt(0, ship.position.y, -5)

      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }
    animate()

    // resize handling
    function handleResize(){
      const w = Math.min(window.innerWidth, 800)
      const h = Math.min(window.innerHeight, 600)
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', handleResize)

    // cleanup
    return ()=>{
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove)
      mountRef.current.removeChild(renderer.domElement)
      renderer.dispose()
    }
  },[])

  return <div className="game-mount" ref={mountRef} />
}
