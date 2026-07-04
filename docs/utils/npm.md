## npx
### 运行命令
`npx`的原理很简单，就是运行的时候，会到`node_modules/.bin`路径和环境变量`$PATH`里面，检查命令是否存在。  
由于`npx`会检查环境变量`$PATH`，所以系统命令也可以调用。
```sh
# 等同于 ls
$ npx ls
```
注意，`Bash`内置的命令不在`$PATH`里面，所以不能用。比如，`cd`是`Bash`命令，因此就不能用`npx cd`。
### 下载模块
`npx`运行的命令本地不存在时，会下载对应模块到临时目录，一段时间后再删除。短时间内运行两次相同的命令不会重新下载
### 使用不同版本的node
```sh
$ npx node@0.12.8 -v
v0.12.8
```
### 参数
详见 http://www.ruanyifeng.com/blog/2019/02/npx.html
### 与npm init相关
```sh
# 在npm6.x，以下命令等价
npm init foo -> npx create-foo
npm init @usr/foo -> npx @usr/create-foo
npm init @usr -> npx @usr/create
# 在npm7.x以后，以下命令等价
npm init foo -> npm exec create-foo
npm init @usr/foo -> npm exec @usr/create-foo
npm init @usr -> npm exec @usr/create
```