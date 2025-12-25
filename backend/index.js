import { createServer } from 'http';

const PORT = process.env.PORT || 3001;
const HOSTNAME = '127.0.0.1';

const server = createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello world');
});

server.listen(PORT, HOSTNAME, ()=>{
    console.log(`Sever is running at http://${HOSTNAME}:${PORT}`);
})