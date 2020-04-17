import express from 'express'
import logger from 'morgan'
import multiparty from 'multiparty'
import cors from 'cors'
import path from 'path'
import fs from 'fs-extra'
import { INTERNAL_SERVER_ERROR, NOT_FOUND } from 'http-status'
import { publicPath, tmpPath, mergeChunks } from './utils'
const app = express()

const PORT = process.env.port

const baseUrl = `http://localhost:${PORT}`

app.use(logger('dev'))
app.use(cors())
app.use(express.static(publicPath))

app.get('/check', async (req, res, next) => {
    const { fileName } = req.query

    const hasFile = await fs.pathExists(path.resolve(publicPath, fileName))
    if (hasFile) {
        res.json({ code: 0, needUpload: false })
    }

    const fileTmpPath = path.resolve(tmpPath, fileName)
    const hasDir = await fs.pathExists(fileTmpPath)
    let chunkListPosition: { [key: string]: number } = {}

    if (hasDir) {
        const files = await fs.readdir(fileTmpPath)
        await Promise.all(files.map(async (file: string) => {
            const stat = await fs.stat(path.resolve(fileTmpPath, file))
            chunkListPosition[file] = stat.size
            // return {
            //     size: stat.size,
            //     chunk_name: file
            // }
        }))
        res.json({
            code: 0,
            needUpload: true,
            chunkListPosition,
        })
    }
    res.json({
        code: 0,
        needUpload: true,
    })
})
app.get('/merge', async (req, res, next) => {
    const { fileName } = req.query
    await mergeChunks(fileName)

    res.json({
        code: 0,
        msg: '上传完成'
    })
})
app.post('/upload', async (req, res, next) => {
    const { fileName, chunkName } = req.query

    const fileTmpPath = path.resolve(tmpPath, fileName)
    const hasFileTmpPath = await fs.pathExists(fileTmpPath)

    if (!hasFileTmpPath) {
        try {
            await fs.mkdir(fileTmpPath)
        } catch (error) {
            
        }
    }

    const writeStream = fs.createWriteStream(path.resolve(fileTmpPath, chunkName), { flags: 'a' })
    req.pipe(writeStream)

    req.on('error', () => {
        writeStream.close()
    })
    req.on('close', () => {
        writeStream.close()
    })
    req.on('end', () => {
        writeStream.close()
        res.json({ code: 0 })
    })
    // const form = new multiparty.Form({
    //     autoFiles: true,
    //     uploadDir: publicPath
    // })

    // form.parse(req, async (err: object, fields: any, files: any) => {
    //     if (err) {
    //         res.sendStatus(INTERNAL_SERVER_ERROR)
    //         return
    //     }

    //     const file = files.picture[0]
    //     const fileOriginalFilename = file.originalFilename;
    //     // const filePath = file.path
    //     // const readStream = fs.createReadStream(filePath)
    //     // const writeStream = fs.createWriteStream(path.resolve(publicPath, fileOriginalFilename))
    //     // readStream.pipe(writeStream)
    //     res.json({
    //         code: 0,
    //         url: `${baseUrl}/${fileOriginalFilename}`
    //     })
    // })
})

app.use((req, res, next) => {
    console.log(333)

    res.sendStatus(NOT_FOUND)
})

app.use((req, res, next) => {
    res.sendStatus(INTERNAL_SERVER_ERROR)
})
export default app
