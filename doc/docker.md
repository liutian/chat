### 制作IM服务器镜像
1. 导入基础镜像
- `sudo cat centos7.tar | sudo docker import - liuss/ichat`
2. 创建容器
- `sudo docker run -id --name ichat --privileged liuss/ichat init`
3. 进入容器
- `sudo docker exec -it ichat /bin/bash`
4. 创建mongodb数据源文件
- `vim /etc/yum.repos.d/mongodb-enterprise.repo`
5. 写入mongodb数据源配置
- `[mongodb-enterprise]
name=MongoDB Enterprise Repository
baseurl=https://repo.mongodb.com/yum/redhat/$releasever/mongodb-enterprise/3.4/$basearch/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-3.4.asc`
6. 安装mongodb
- `yum install -y mongodb-enterprise`
7. 启动mongodb
- `systemctl start mongod `
8. 设置mongodb开机启动
- `systemctl enable mongod.service`
9. 安装nodejs
- `curl --silent --location https://rpm.nodesource.com/setup_7.x | bash - && yum -y install nodejs`
10. 安装pm2
- `npm install pm2 -g`
11. 安装nginx，并修改nginx配置文件
- `yum install -y nginx`



###制作jenkins镜像
1. 导入基础镜像
- `sudo cat centos7.tar | sudo docker import - liuss/jenkins`
2. 创建容器
- `sudo docker run -id --name jenkins --privileged liuss/jenkins init`
3. 进入容器
- `sudo docker exec -it jenkins /bin/bash`
4. 搜索java源
- `yum list java*`
5. 安装java
- `cd /root && yum install -y java-1.8.0-openjdk.x86_64`
6. 下载jenkins
- `wget http://mirrors.jenkins.io/war-stable/latest/jenkins.war`
7. 启动jenkins 记录 超级管理员密码
- `java -jar jenkins.war`
8. 访问http://host:8080 》输入超级管理员密码 》选择通用安装 》创建管理员(root/zaq12wsx) 》安装插件 (Publish over SSH)
9. 创建ssh服务器访问凭证
- 系统配置 > Publish over SSH
10. 创建代码托管服务凭证(拉取git代码的权限)
- credentials > system > global credentials > add credentials
- kind 选择 'ssh username with private key'
- 输入 username
- 选择 enter directly 并输入 git秘钥文件内容
11. 创建自由风格的软件项目
- 选择 源码管理 > git > 地址，Credentials > 选择分支
- 选择 构建 > 输入构建命令：npm run build
- 选择 send file or execute commands over ssh > 选择 第9步创建的ssh凭证

