import React from 'react'
import ReactDOM from 'react-dom/client'
import { loader } from '@monaco-editor/react'
import App from './App'
import './index.css'

// Monaco Editor를 위한 CDN 경로 설정 (Electron에서 로컬 파일 로딩 문제 해결)
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } })

const root = ReactDOM.createRoot(document.getElementById('root'))

if (!window.api) {
  root.render(
    <div className="p-10 text-red-600 font-bold">
      Critical Error: window.api is not loaded.<br/>
      Preload script failed to execute.<br/>
      Please check console logs.
    </div>
  )
} else {
  root.render(
    <App />
  )
}
