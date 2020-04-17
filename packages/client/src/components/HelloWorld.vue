<template>
  <div class="hello">
    <input @change="fileChange" type="file" />
    <div>
      <el-button @click="handlerClick" type="primary">上传</el-button>
      <el-button @click="handlerAbort" type="primary">暂停</el-button>
    </div>
    <div v-if="isCalculate">
      <h2>{{ hashProgress }}</h2>
      <el-progress :percentage="hashPercentage"></el-progress>
    </div>
    <div v-if="isUploading">
      <h2>上传</h2>
      <el-progress
        v-for="itemChunk in chunkList"
        :key="itemChunk.chunk_name"
        :percentage="itemChunk.progress"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { request, ResponseData } from '@/scripts/request'
import { Component, Prop, Vue } from 'vue-property-decorator';
const defaultSize = 1024 * 1024 * 100 //  默认值100兆

interface Chunk {
  size: number;
  chunk: Blob;
  filename?: string;
  chunk_name?: string;
  xhr?: XMLHttpRequest;
  progress?: any;
  oldSize?: number;
  serverSize?: number;
}
@Component
export default class HelloWorld extends Vue {
  @Prop() private msg!: string;
  private formData = {}
  private fileChunk: File = null
  private chunkList: Chunk[] = []
  private hashPercentage: number = 0
  private isCalculate: boolean = false
  private isUploading: boolean = false
  private filename: string = '' // 以hash命名
  
  get hashProgress() {
    return this.hashPercentage < 100 ? 'hash计算中...' : 'hash计算完成'
  }

  private fileChange(event: any): void {
    const file: File = event.target.files[0];
    this.fileChunk = file
    const formData: FormData = new FormData();
    formData.append('picture', file);
    this.formData = formData
  };
  private splitChunks(): void {
    let current = 0 // 分隔的内容
    let index = 0 // 默认索引，用来区分分隔的模块

    while (current < this.fileChunk.size) {
      const chunk = this.fileChunk.slice(current, current + defaultSize)
      const chunk_name = `${this.fileChunk.name}-${index}`
      const size = chunk.size
      this.chunkList.push({ chunk, chunk_name, size })
      index++
      current += defaultSize
    }
  }
  private async createHash() {
    return new Promise((resolve, reject) => {
      const worker = new Worker('/hash.js')
      worker.postMessage({ chunkList: this.chunkList })
      worker.onmessage = (event) => {
        const { percent, hash } = event.data
        this.hashPercentage = percent
        if (hash) {
          resolve(hash)
        }
      }
    })
  }
  private async handlerClick() {
    if (!this.filename) {
      // 拆分模块
      this.splitChunks()
      // 根据拆分的模块计算文件hash值
      this.isCalculate = true
      const hash = await this.createHash()
      const fileName = `${hash}.${this.fileChunk.name.split('.').pop()}`
      this.filename = fileName
      this.chunkList.forEach(chunk => {
        chunk.filename = this.filename
      })
    }
    // 先确定有没有上传过
    const result: ResponseData = await this.check()
    const { code, needUpload, chunkListPosition } = result
    if (code === 0 && !needUpload) {
      this.$message('上传完成')
      return
    } else if (needUpload && chunkListPosition) {
      this.chunkList.forEach((chunk) => {
        const size = chunkListPosition[chunk.chunk_name]
        chunk.oldSize = chunk.size
        chunk.serverSize = size
        chunk.chunk = size ? chunk.chunk.slice(size) : chunk.chunk
      })
    }
    
    // 上传拆分后的chunk
    await this.upload()
    // 通知服务端合并chunk
    this.merge().then(({ code, msg }) => {
      this.$message(msg);
      this.isUploading = false
    })

  }
  private handlerAbort() {
    this.chunkList.forEach(itemChunk => {
      itemChunk.xhr.abort()
    })
  }
  private upload() {
    this.isUploading = true
    return Promise.all(this.chunkList.map((itemChunk, index) => {
      return new Promise((resolve, reject) => {
        const { size, chunk, chunk_name, filename } = itemChunk
        request({
          type: 'POST',
          path: `/upload?fileName=${filename}&chunkName=${chunk_name}`,
          headers: {
            // 二进制文件没有特定或已知的 subtype，即使用 application/octet-stream
            'Content-Type': 'application/octet-stream'
          },
          data: chunk,
          setXhr: xhr => {
            itemChunk.xhr = xhr
          },
          setProgress: loaded => {
            const loadedSize = itemChunk.serverSize ? itemChunk.serverSize + loaded : loaded
            const totalSize = itemChunk.oldSize ? itemChunk.oldSize : itemChunk.size
            const progress = +(loadedSize / totalSize).toFixed(2) * 100
            this.$set(this.chunkList, index, { ...itemChunk, progress })
          }
        })
        .then(resolve)
      })
    }))
  }
  private merge() {
    return request({
      type: 'GET',
      path: `/merge?fileName=${this.filename}`
    })
  }
  private check() {
    return request({
      type: 'GET',
      path: `/check?fileName=${this.filename}`
    })
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  padding: 0;

  list-style-type: none;
}
li {
  display: inline-block;

  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
