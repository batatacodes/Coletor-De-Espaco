import React from 'react'
import Game from './components/Game'
import HUD from './components/HUD'

export default function App(){
  return (
    <div className="app-root">
      <HUD />
      <Game />
    </div>
  )
}
