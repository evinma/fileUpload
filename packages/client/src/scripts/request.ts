interface RequestOptions {
    path: string;
    type?: string;
    headers?: object;
    data?: any;
    setXhr?: Function;
    setProgress?: Function;
}

export interface ResponseData {
    code?: number;
    msg?: string,
    needUpload?: boolean,
    chunkListPosition?: []
}
export const request = (options: RequestOptions) => {
    return new Promise((resolve, reject) => {
        const baseUrl = 'http://localhost:3000'
        const defaultType = 'GET'

        const { type = defaultType, path, headers = {}, data, setXhr, setProgress } = options

        const req = new XMLHttpRequest()
        req.open(type, `${baseUrl}${path}`, true)

        Object.keys(headers).forEach((item: string) => {
            req.setRequestHeader(item, headers[item])
        });
        req.onload = () => {
            const resData: ResponseData = { code: 0, ...JSON.parse(req.response) }
            resolve(resData)
        };
        req.onerror = () => {
            const resData: ResponseData = { code: 999 }
            resolve(resData)
        }
        req.upload.onprogress = (event) => {
            const { loaded } = event
            if (setProgress) {
                setProgress(loaded)
            }
        }
        // req.onprogress = (event) => {
            
        // }
        req.send(data);
        if (setXhr) {
            setXhr(req)
        }
    })
};
