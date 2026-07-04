import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'production',
  optimization: {
    minimize: false,
  },
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'lib.js',
    clean: true,
    library: {
      type: 'module',
    },
  },
  experiments: {
    outputModule: true,
  },
  plugins: [],
  module: {
    // rules: [
    //   {
    //     test: /\.js$/,
    //     type: 'javascript/auto',
    //   },
    // ],
  },
};
