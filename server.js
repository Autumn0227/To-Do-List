const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// 设置静态文件目录
app.use(express.static(path.join(__dirname)));

// 处理所有路由请求，返回index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
  console.log('按 Ctrl+C 停止服务器');
});