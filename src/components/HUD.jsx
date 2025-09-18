import React, { useEffect, useState } from 'react'

export default function HUD(){
  const [score, setScore] = useState(() => Number(localStorage.getItem('coletor_score') || 0))
  useEffect(()=>{
    const handle = (e)=>{
      if(e.detail && typeof e.detail.score === 'number') setScore(e.detail.score)
    }
    window.addEventListener('coletor:updateScore', handle)
    return ()=> window.removeEventListener('coletor:updateScore', handle)
  },[])
  return (
    <div className="hud">
      <div className="hud-left">Coletor no Espaço</div>
      <div className="hud-right">Pontos: <span className="score">{score}</span></div>
    </div>
  )
}
