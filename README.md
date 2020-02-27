# metersphere-chrome-plugin



## 目录

- [发布](#发布)
- [.crx文件](#.crx文件)
- [备注](#备注)


#### 发布

  - 谷歌浏览器输入chrome://extensions/ 进入扩展程序安装界面，打开开发者模式
  - 导入扩展程序有 3 种方式
     - 通过加载已解压文件按钮，导入当前项目
     - 通过 `zip -qr -9 -X metervsphere.zip . -x ./.git/* -x ./.idea/*` 命令压缩文件，将文件拖到扩展程序安装界面
     - 通过 shell 脚本打包成 .crx文件,将文件拖到扩展程序安装界面


#### .crx文件
   - 通过 build.sh 脚本可将项目打包成.crx 文件，`./build.sh <extension dir> <pem path>`（目前生成的.crx 文件 Chrome 73 以后的不能使用，研究中。  参考地址：http://web.archive.org/web/20180114090616/https://developer.chrome.com/extensions/crx#scripts，https://developer.chrome.com/extensions/hosting）
   - 通过扩展程序安装界面，开发者模式模式下打包项目成 .crx文件
  

#### 备注
   - 目前脚本只对 Jmeter 5.2.1
