import React, { useState, useEffect } from 'react'

const SettingsModal = ({ isOpen, onClose, onSave }) => {
  const [compilers, setCompilers] = useState({
    cpp: '',
    python: '',
    java: ''
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      // Load settings when modal opens
      const loadSettings = async () => {
        try {
          const settings = await window.api.getSettings()
          setCompilers(settings)
        } catch (error) {
          console.error('Failed to load settings:', error)
        } finally {
          setLoading(false)
        }
      }
      loadSettings()
    }
  }, [isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setCompilers(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async () => {
    try {
      await window.api.saveSettings(compilers)
      onSave()
      onClose()
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert(`Failed to save settings: ${error.message || error}`)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[9999] backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white border border-gray-200 p-8 rounded-2xl w-[450px] shadow-2xl overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
        <h2 className="text-2xl font-extrabold text-gray-900 mb-6">Compiler Settings</h2>
        
        {loading ? (
          <div className="text-gray-500 text-center py-10 font-medium">Loading settings...</div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">C++ Compiler Path (g++)</label>
              <input
                type="text"
                name="cpp"
                value={compilers.cpp}
                onChange={handleChange}
                className="w-full bg-white border border-gray-300 rounded-xl p-3 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                placeholder="e.g. /usr/bin/g++"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Python Interpreter Path</label>
              <input
                type="text"
                name="python"
                value={compilers.python}
                onChange={handleChange}
                className="w-full bg-white border border-gray-300 rounded-xl p-3 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                placeholder="e.g. /usr/bin/python3"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Java Compiler Path (javac)</label>
              <input
                type="text"
                name="java"
                value={compilers.java}
                onChange={handleChange}
                className="w-full bg-white border border-gray-300 rounded-xl p-3 text-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                placeholder="e.g. /usr/bin/javac"
              />
            </div>
          </div>
        )}

        <div className="mt-10 flex justify-end space-x-4">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm text-gray-700 font-bold transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm text-white font-bold transition-all shadow-md active:scale-95"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
