self.importScripts('https://cdn.bootcss.com/spark-md5/3.0.0/spark-md5.js')
self.onmessage = async (event) => {
    const { chunkList } = event.data
    const spark = new self.SparkMD5.ArrayBuffer()
    const progressSize = 100 / chunkList.length
    let percent = 0

    const buffers = await Promise.all(chunkList.map((chunk) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsArrayBuffer(chunk.chunk)
            reader.onload = (event) => {
                resolve(event.target.result)
            }
        })
    }))

    buffers.forEach((buffer) => {
        spark.append(buffer)
        // 更新hash计算的进度条
        percent += progressSize
        self.postMessage({ percent: +percent.toFixed(2) })  
    })
    // postMessage 第二个参数表示通过窗口的origin属性来指定哪些窗口能接收到消息事件
    // * 表示无限制
    self.postMessage({ percent: 100, hash: spark.end() })
    self.close()
}