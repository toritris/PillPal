import { resolve } from 'path'
import { normalizePath } from 'vite'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const sharedAlias = normalizePath(resolve(__dirname, 'src/shared'))
const rendererAlias = normalizePath(resolve(__dirname, 'src/renderer/src'))

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        // Use function form so it catches both specifier 'sql.js' AND resolved path
        external(id: string) {
          if (id === 'electron') return true
          if (id === 'sql.js' || id.includes('sql.js')) return true
          if (id.startsWith('node:')) return true
          return false
        }
      }
    },
    resolve: {
      alias: {
        '@shared': sharedAlias
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': sharedAlias
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@shared': sharedAlias,
        '@renderer': rendererAlias
      }
    },
    plugins: [react()]
  }
})
