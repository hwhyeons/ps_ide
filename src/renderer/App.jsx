import React, { useState } from 'react'
import Editor from '@monaco-editor/react'
import SettingsModal from './components/SettingsModal'

const DEFAULT_CODE = {
  cpp: `#include <iostream>

using namespace std;

int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << a + b << endl;
    }
    return 0;
}`,
  python: `import sys

# Read input from stdin
try:
    input_data = sys.stdin.read().split()
    if len(input_data) >= 2:
        a = int(input_data[0])
        b = int(input_data[1])
        print(a + b)
except Exception as e:
    print(e)`,
  java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNextInt()) {
            int a = scanner.nextInt();
            int b = scanner.nextInt();
            System.out.println(a + b);
        }
        scanner.close();
    }
}`
}

function App() {
  const [language, setLanguage] = useState('cpp')
  // 언어별 코드를 저장하는 객체 상태
  const [codes, setCodes] = useState(DEFAULT_CODE)
  // 현재 에디터에 표시되는 코드는 codes[language]를 사용
  const [testCases, setTestCases] = useState([
    { id: 1, input: '10 20', expectedOutput: '30', actualOutput: '', status: 'idle' }
  ])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [overallStatus, setOverallStatus] = useState('Ready')
  const [isLoaded, setIsLoaded] = useState(false) // 초기 로딩 완료 여부

  // 초기 세션 복원
  React.useEffect(() => {
    const loadSession = async () => {
      try {
        const lastSession = await window.api.getLastSession()
        if (lastSession) {
          if (lastSession.language) setLanguage(lastSession.language)
          if (lastSession.codes) setCodes(prev => ({ ...prev, ...lastSession.codes }))
          if (lastSession.testCases) setTestCases(lastSession.testCases)
        }
      } catch (err) {
        console.error('Failed to load last session:', err)
      } finally {
        setIsLoaded(true)
      }
    }
    loadSession()
  }, [])

  // 자동 저장 (Debounce: 1초)
  React.useEffect(() => {
    if (!isLoaded) return

    const timer = setTimeout(() => {
      window.api.saveLastSession({
        language,
        codes,
        testCases
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [language, codes, testCases, isLoaded])

  const handleEditorChange = (value) => {
    setCodes(prev => ({
      ...prev,
      [language]: value
    }))
  }

  // ... (editorOptions remains the same)

  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    glyphMargin: false,
    folding: true,
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    acceptSuggestionOnEnter: 'off',
    tabCompletion: 'off',
    wordBasedSuggestions: false,
    parameterHints: { enabled: false },
    suggest: {
      showMethods: false,
      showFunctions: false,
      showConstructors: false,
      showFields: false,
      showVariables: false,
      showClasses: false,
      showInterfaces: false,
      showModules: false,
      showProperties: false,
      showEvents: false,
      showOperators: false,
      showUnits: false,
      showValue: false,
      showConstant: false,
      showEnum: false,
      showEnumMember: false,
      showKeyword: false,
      showSnippet: false,
      showColor: false,
      showFile: false,
      showReference: false,
      showFolder: false,
      showTypeParameter: false,
      showSnippets: false,
    }
  }

  const languageMap = {
    cpp: 'cpp',
    python: 'python',
    java: 'java'
  }

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value)
  }

  const addTestCase = () => {
    setTestCases([...testCases, { 
      id: Date.now(), 
      input: '', 
      expectedOutput: '', 
      actualOutput: '', 
      status: 'idle' 
    }])
  }

  const removeTestCase = (id) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter(tc => tc.id !== id))
    }
  }

  const updateTestCase = (id, field, value) => {
    setTestCases(testCases.map(tc => tc.id === id ? { ...tc, [field]: value } : tc))
  }

  const handleRun = async () => {
    setIsRunning(true)
    setOverallStatus('Running...')
    
    // Create a copy to update status during execution
    const currentTestCases = [...testCases]
    
    // Reset statuses
    currentTestCases.forEach(tc => {
      tc.status = 'waiting'
      tc.actualOutput = ''
    })
    setTestCases([...currentTestCases])

    for (let i = 0; i < currentTestCases.length; i++) {
      // Set current case to running
      currentTestCases[i].status = 'running'
      setTestCases([...currentTestCases])

      try {
        const result = await window.api.runCode({
          language,
          code: codes[language],
          input: currentTestCases[i].input
        })

        if (result.success) {
          const actual = result.stdout ? result.stdout.trim() : ''
          const expected = currentTestCases[i].expectedOutput ? currentTestCases[i].expectedOutput.trim() : ''
          
          currentTestCases[i].actualOutput = result.stdout
          currentTestCases[i].status = (actual === expected) ? 'correct' : 'wrong'
          
          if (result.stderr) {
             currentTestCases[i].actualOutput += `\n[Stderr]\n${result.stderr}`
          }
        } else {
          currentTestCases[i].actualOutput = `Error: ${result.error}`
          currentTestCases[i].status = 'error'
        }
      } catch (err) {
        currentTestCases[i].actualOutput = `System Error: ${err.message}`
        currentTestCases[i].status = 'error'
      }
      // Update state after each case
      setTestCases([...currentTestCases])
    }

    setIsRunning(false)
    setOverallStatus('Finished')
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900">
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => console.log('Settings saved')}
      />
      
      <header className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm h-16">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold italic text-blue-600">PS IDE</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isRunning ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
            {overallStatus}
          </span>
        </div>
        <div className="space-x-4 flex items-center">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="text-gray-600 hover:text-blue-600 text-sm mr-2 font-medium"
          >
            ⚙️ Settings
          </button>
          <select 
            value={language}
            onChange={handleLanguageChange}
            className="bg-white text-sm p-1.5 rounded border border-gray-300 outline-none focus:border-blue-500 font-medium"
          >
            <option value="cpp">C++</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
          </select>
          <button 
            onClick={handleRun}
            disabled={isRunning}
            className={`px-6 py-1.5 rounded font-bold text-white transition-all shadow-md active:scale-95 ${isRunning ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {isRunning ? 'Running...' : 'Run All'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 border-r border-gray-200 relative">
          <Editor
            height="100%"
            theme="light"
            language={languageMap[language]}
            value={codes[language]}
            onChange={handleEditorChange}
            options={editorOptions}
            loading={<div className="h-full flex items-center justify-center text-gray-400 font-medium">Loading Editor...</div>}
            onMount={(editor, monaco) => {
              monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                noSemanticValidation: true,
                noSyntaxValidation: true
              })
            }}
          />
        </div>

        <aside className="w-[500px] bg-gray-50 flex flex-col overflow-hidden border-l border-gray-200">
          <div className="p-4 flex justify-between items-center border-b border-gray-200 bg-white h-14">
            <h2 className="text-lg font-bold text-gray-800">Test Cases</h2>
            <button 
              onClick={addTestCase}
              className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-bold hover:bg-blue-100 transition-colors"
            >
              + Add Case
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {testCases.map((tc, index) => (
              <div key={tc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Case #{index + 1}</span>
                  <div className="flex items-center space-x-2">
                    {tc.status === 'correct' && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">✅ Correct</span>}
                    {tc.status === 'wrong' && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">❌ Wrong Answer</span>}
                    {tc.status === 'running' && <span className="text-xs font-bold text-blue-600 animate-pulse">Running...</span>}
                    {tc.status === 'waiting' && <span className="text-xs font-bold text-gray-400">Waiting...</span>}
                    {tc.status === 'error' && <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">⚠️ Error</span>}
                    <button 
                      onClick={() => removeTestCase(tc.id)}
                      className="text-gray-400 hover:text-red-500 text-sm font-bold ml-2 w-6 h-6 flex items-center justify-center rounded hover:bg-red-50"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Input</label>
                    <textarea 
                      value={tc.input}
                      onChange={(e) => updateTestCase(tc.id, 'input', e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 font-mono resize-none" 
                      rows="3"
                    ></textarea>
                  </div>
                  <div className="flex flex-col">
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Expected</label>
                    <textarea 
                      value={tc.expectedOutput}
                      onChange={(e) => updateTestCase(tc.id, 'expectedOutput', e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 font-mono resize-none" 
                      rows="3"
                    ></textarea>
                  </div>
                </div>
                {tc.actualOutput && (
                  <div className="px-4 pb-4">
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Actual Output</label>
                    <pre className={`p-2 rounded-lg text-xs font-mono whitespace-pre-wrap overflow-x-auto ${tc.status === 'correct' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                      {tc.actualOutput}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App