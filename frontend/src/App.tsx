import './App.css'
import GameCanvas from './components/GameCanvas'
import GameControls from './components/GameControls'

function App() {
  return (
    <div className="h-screen w-screen overflow-clip">
      <GameCanvas />
      <GameControls />
    </div>
  )
}

export default App
