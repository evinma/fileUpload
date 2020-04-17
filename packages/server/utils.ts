import path from 'path'
import fs, { WriteStream } from 'fs-extra'
// import sparkMd5 from 'spark-md5'

export const publicPath = path.resolve(__dirname, 'public')
export const tmpPath = path.resolve(__dirname, 'tmp')

const defaultSize = 1024 * 1024 * 100 //  默认值100兆

const splitChunks = async (fileName: string, size: number = defaultSize) => {
    const filePath = path.resolve(publicPath, fileName) // 文件路径
    const writeDir = path.resolve(tmpPath, fileName) // 要写入的临时文件目录
    const stat = await fs.stat(filePath) // 查看当前路径的状态
    const sourceFile = await fs.readFile(filePath) // 拿到要分隔源文件的 buffer
    await fs.mkdir(writeDir) // 创建临时目录
    let current = 0 // 分隔的内容
    let index = 0 // 默认索引，用来区分分隔的模块

    while (current < stat.size) {
        await fs.writeFile(
            path.resolve(writeDir, `${fileName}-${index}`),
            sourceFile.slice(current, size)
        )
        index++
        current += size
    }
}
const pipeStream =(filePath: string, writeStream: WriteStream) => {
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(filePath)
        readStream.on('end', async () => {
            await fs.unlink(filePath) // 异步地删除文件或符号链接
            resolve()
        })
        // writeStream.on('close', async () => {
        //     await fs.unlink(filePath) // 异步地删除文件或符号链接
        //     resolve()
        // })
        readStream.pipe(writeStream)
    })
}
export const mergeChunks = async (fileName: string, size: number = defaultSize) => {
    const filePath = path.resolve(publicPath, fileName) // 将要写入的文件路径
    const tmpFileDir = path.resolve(tmpPath, fileName) // 之前写入的临时文件目录

    const chunks = await fs.readdir(tmpFileDir) // 临时目录中的文件碎片
    // 将文件碎片按照序号排序
    chunks.sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]))  

    const promisifyChunks = chunks.map((chunk, index) => {
        return pipeStream(
            path.resolve(tmpFileDir, chunk),
            fs.createWriteStream(filePath, { start: index * size, emitClose: true })
        )
    })
    await Promise.all(promisifyChunks)
    await fs.rmdir(tmpFileDir)
}
