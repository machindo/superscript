import { TsConfigPathsPlugin } from 'awesome-typescript-loader'
// @ts-ignore
import BitBarWebpackProgressPlugin from 'bitbar-webpack-progress-plugin'
// @ts-ignore
import CopyPlugin from 'copy-webpack-plugin'
import Dotenv from 'dotenv-webpack'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import path from 'path'

const commonConfig = {
  devtool: process.env.NODE_ENV === 'development' ? 'source-map' : undefined,
  mode: process.env.NODE_ENV || 'production',
  module: {
    rules: [
      {
        test: /\.node$/,
        use: 'node-loader'
      }, {
        test: /\.styl$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'stylus-loader'
          }
        ]
      }, {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      }, {
        test: /\.ts$/,
        enforce: 'pre',
        loader: 'tslint-loader',
        options: {
          typeCheck: true
        }
      }, {
        test: /\.tsx?$/,
        loader: 'awesome-typescript-loader'
      }, {
        test: /\.svg$/,
        use: [{
          loader: 'html-loader',
          options: {
            minimize: true
          }
        }]
      }, {
        test: /\.vue\.html$/,
        use: 'vue-template-loader'
      }, {
        test: /\.(eot|otf|ttf|woff|woff2)$/,
        loader: 'file-loader'
      }, {
        test: /\.worker\.(js|ts)/,
        loader: 'worker-loader'
      }
    ]
  },
  resolve: {
    alias: {
      pdfjs$: 'pdfjs-dist/webpack.mjs',
      pdfmake$: 'pdfmake/build/pdfmake.js',
      vue$: 'vue/dist/vue.esm.js'
    },
    extensions: ['.js', '.ts', '.tsx', '.jsx', '.json', '.styl'],
    plugins: [
      new TsConfigPathsPlugin()
    ]
  },
  node: {
    __dirname: false
  },
  externals: {
    // The following must be external to work properly
    'chokidar': 'require("chokidar")',
    'electron-about-window': 'require("electron-about-window")',
    'electron-spellchecker': 'require("electron-spellchecker")',
    'electron-updater': 'require("electron-updater")',
    'fs-extra': 'require("fs-extra")',
    'pdfjs-dist': 'require("pdfjs-dist")',
    'robotjs': 'require("robotjs")'
  }
}

const configs: any[] = [
  Object.assign(
    {
      entry: { main: './src/main/main.ts' },
      output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'packed')
      },
      target: 'electron-main',
      plugins: [
        new BitBarWebpackProgressPlugin(),
        new Dotenv()
      ]
    },
    commonConfig),
  Object.assign(
    {
      entry: {
        editor: './src/windows/editor-window/renderer.ts',
        export: './src/windows/export-window/renderer.ts',
        parent: './src/windows/parent-window/renderer.ts',
        preferences: './src/windows/preferences-window/renderer.ts'
      },
      output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'packed')
      },
      optimization: {
        splitChunks: {
          chunks: 'all'
        }
      },
      target: 'electron-renderer',
      plugins: [
        new BitBarWebpackProgressPlugin(),
        new HtmlWebpackPlugin({
          filename: 'editor.html',
          excludeChunks: ['export', 'parent', 'preferences'],
          minify: { collapseWhitespace: true },
          template: 'src/windows/editor-window/renderer.html'
        }),
        new HtmlWebpackPlugin({
          filename: 'export.html',
          excludeChunks: ['editor', 'parent', 'preferences'],
          minify: { collapseWhitespace: true },
          template: 'src/windows/export-window/renderer.html'
        }),
        new HtmlWebpackPlugin({
          filename: 'parent.html',
          excludeChunks: ['editor', 'export', 'preferences'],
          minify: { collapseWhitespace: true },
          template: 'src/windows/parent-window/renderer.html'
        }),
        new HtmlWebpackPlugin({
          filename: 'preferences.html',
          excludeChunks: ['editor', 'export', 'parent'],
          minify: { collapseWhitespace: true },
          template: 'src/windows/preferences-window/renderer.html'
        }),
        new CopyPlugin({
          patterns: ['node_modules/pdfjs-dist/build/pdf.worker.min.mjs']
        }),
        new Dotenv()
      ]
    },
    commonConfig)
]

export default configs
