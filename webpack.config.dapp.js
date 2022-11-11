const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: 'development',
  entry: ['babel-polyfill', path.join(__dirname, "src/dapp")],
  //entry: ['./src/dapp/index'],
  module: {
    rules: [
    {
        test: /\.(js|jsx)$/,
        use: "babel-loader",
        exclude: /node_modules/,
        // use: {
        //   loader: 'babel-loader',
        //   options: {
        //     presets: [
        //       ['@babel/preset-env', { targets: "defaults" }]
        //     ]
        //   }
        // }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
        exclude: /node_modules/

      },
      {
        test: /\.(png|svg|jpg|gif|ico)$/i,
        type: 'asset/resource'
      },
      {
        test: /\.html$/,
        use: "html-loader",
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({ 
      template: path.join(__dirname, "src/dapp/index.html")
    })
  ],
  resolve: {
    extensions: [".js"]
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'src/dapp'),
    },
    port: 8000,
    //stats: "minimal"
  },
  output: {
    path: path.join(__dirname, 'prod/dapp'),
    filename: 'bundle.js'
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
}
};
