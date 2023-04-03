/*
 * @功能描述: 
 */
const {CleanWebpackPlugin} = require('clean-webpack-plugin')

module.exports = {
  output: {
    filename: '[name].[chunkhash].js'
  },
  plugins: [
    new CleanWebpackPlugin()
  ]
}
