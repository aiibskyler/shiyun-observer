import { useGameStore } from './stores/gameStore'
import { WelcomePage } from './components/WelcomePage'
import { GameScene } from './components/GameScene'
import { GameUI } from './components/GameUI'
import { AnalysisPage } from './components/AnalysisPage'

function App() {
  const gameState = useGameStore(s => s.gameState)

  console.log('[App] Rendering with gameState:', gameState)

  return (
    <>
      {gameState === 'welcome' && <WelcomePage />}
      {gameState === 'playing' && (
        <>
          {console.log('[App] Rendering GameScene and GameUI')}
          <GameScene />
          <GameUI />
        </>
      )}
      {gameState === 'analyzing' && <AnalysisPage />}
    </>
  )
}

export default App
