const { defineConfig } = require('@vue/cli-service');
const path = require('path');

// 获取绝对路径
const resolve = (dir) => path.resolve(__dirname, dir);

module.exports = defineConfig({
  publicPath: '/',
  outputDir: 'dist',
  transpileDependencies: true,
  lintOnSave: false,
  configureWebpack: {
    resolve: {
      alias: {
        '@': resolve('src')
      }
    },
    // 禁用代码压缩，解决Terser错误
    optimization: {
      minimize: false
    },
    // 配置代码分割，减少懒加载出错
    output: {
      filename: 'js/[name].[hash].js',
      chunkFilename: 'js/[name].[hash].js'
    }
  },
  devServer: {
    host: '0.0.0.0',
    port: 5173,
    hot: false,
    liveReload: false,
    client: false,
    webSocketServer: false,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        pathRewrite: {
          '^/api': ''
        }
      },
      '/oss': {
        target: 'https://mediaminds.oss-cn-beijing.aliyuncs.com',
        changeOrigin: true,
        pathRewrite: {
          '^/oss': ''
        },
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      },
      '/ws': {
        target: 'http://localhost:9001',
        ws: true,
        changeOrigin: true,
        pathRewrite: { '^/ws': '/ws' },
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      }
    }
  }
}); 