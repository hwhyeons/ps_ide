import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import fs from 'fs'
import os from 'os'
import { spawn, exec } from 'child_process'
import path from 'path'

const store = new Store({
  defaults: {
    compilers: {
      cpp: 'g++',
      python: 'python3',
      java: 'javac'
    }
  }
})

// Helper to execute commands using promise
const executeCommand = (command, args, input = '', timeout = 5000) => {
  return new Promise((resolve, reject) => {
    let stdoutData = ''
    let stderrData = ''
    let killed = false

    const proc = spawn(command, args)

    const timer = setTimeout(() => {
      killed = true
      proc.kill()
      reject({ message: 'Time Limit Exceeded (5s)' })
    }, timeout)

    if (input) {
      proc.stdin.write(input)
      proc.stdin.end()
    }

    proc.stdout.on('data', (data) => {
      stdoutData += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderrData += data.toString()
    })

    proc.on('close', (code) => {
      clearTimeout(timer)
      if (!killed) {
        resolve({ stdout: stdoutData, stderr: stderrData, code })
      }
    })

    proc.on('error', (err) => {
      clearTimeout(timer)
      if (!killed) {
        reject({ message: err.message })
      }
    })
  })
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC Handlers for Settings
  ipcMain.handle('get-settings', () => {
    return store.get('compilers')
  })

  ipcMain.handle('save-settings', (_, settings) => {
    try {
      console.log('Saving settings:', settings)
      store.set('compilers', settings)
      console.log('Settings saved successfully.')
      return true
    } catch (error) {
      console.error('Error saving settings:', error)
      throw error
    }
  })

  // IPC Handler for Code Execution
  ipcMain.handle('run-code', async (_, { language, code, input }) => {
    const compilers = store.get('compilers')
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-ide-'))
    
    try {
      let result

      if (language === 'cpp') {
        const sourcePath = path.join(tmpDir, 'main.cpp')
        const binaryPath = path.join(tmpDir, 'main.out')
        fs.writeFileSync(sourcePath, code)

        // Compile
        await executeCommand(compilers.cpp, [sourcePath, '-o', binaryPath])

        // Execute
        result = await executeCommand(binaryPath, [], input)

      } else if (language === 'python') {
        const sourcePath = path.join(tmpDir, 'main.py')
        fs.writeFileSync(sourcePath, code)

        // Execute
        result = await executeCommand(compilers.python, [sourcePath], input)

      } else if (language === 'java') {
        const className = 'Main' // Java requires class name matching file
        const sourcePath = path.join(tmpDir, `${className}.java`)
        fs.writeFileSync(sourcePath, code)

        // Compile
        await executeCommand(compilers.java, [sourcePath])

        // Execute
        // Java 실행 시 classpath 설정 필요 (-cp)
        result = await executeCommand('java', ['-cp', tmpDir, className], input)
      } else {
        throw new Error('Unsupported language')
      }

      return { success: true, ...result }

    } catch (error) {
      return { success: false, error: error.message || error.toString() }
    } finally {
      // Cleanup
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      } catch (e) {
        console.error('Failed to clean up temp dir:', e)
      }
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
