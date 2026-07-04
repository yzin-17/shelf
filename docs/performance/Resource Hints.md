# Resource Hints

## dns-prefetch

`<link rel="dns-prefetch">`要求浏览器提前对域进行 DNS 解析。

浏览器在连接到新的第三方域时必须执行 DNS 解析。对于每个新域，解析 DNS 记录通常[需要大约 20-120 毫秒](https://www.keycdn.com/support/reduce-dns-lookups)。它只影响从该域下载的第一个资源，但它仍然很重要。如果您提前执行 DNS 解析，您将节省时间并更快地加载该资源。

**不是强制性的。**浏览器*不需要*遵循`<link rel="dns-prefetch">`指令。这意味着它可以决定不执行 DNS 解析——例如，如果它们已经很多，或者在其他情况下。

### 用法

```html
<link rel="dns-prefetch" href="https://api.my-app.com" />
```

`href`指向要解析的域名。该计划无关紧要 - 两者都`https://api.my-app.com`可以`//api.my-app.com`正常工作。

#### 与preconnect区别

对同一个域使用这两个标签并不是很有用；`<link rel="preconnect" />`已经包含了`<link rel="dns-prefetch" />`。但是，它在以下情况下仍然有意义：

- *您想支持旧版浏览器。* [从 IE10 和 Safari 5 开始](https://caniuse.com/#feat=link-rel-dns-prefetch)`<link rel="dns-prefetch" />`已被支持。`<link rel="preconnect" />`在 Safari 11.1 中才支持 ，并且[在 IE/非 Chromium Edge 中不受支持](https://caniuse.com/#feat=link-rel-preconnect)。如果您需要支持这些浏览器，可同时使用两个标签。

#### 浏览器自动解析

浏览器引擎在解析HTML页面的时候，会自动获取当前页面所有的a标签herf属性当中的域名，然后进行 ***DNS Prefetch***。这个解析过程是与用户浏览网页并行处理的。但是为了确保安全性，在HTTPS页面中没有开启 ***DNS Prefetch***。

```html
// 开启DNS Prefetch
<meta http-equiv="x-dns-prefetch-control" content="on">

// 关闭DNS Prefetch
<meta http-equiv="x-dns-prefetch-control" content="off">
```

### 原理

当浏览器访问一个域名的时候，需要解析一次DNS，获得对应域名的ip地址。 在解析过程中，按照:

- 浏览器缓存
- 系统缓存
- 路由器缓存
- ISP(运营商)DNS缓存
- 根域名服务器
- 顶级域名服务器
- 主域名服务器

的顺序逐步读取缓存，直到拿到IP地址。`dns-prefetch` 相当于在浏览器缓存之后，在本地操作系统中做了DNS缓存。

打开`dns-prefetch`之后，浏览器会在空闲时间提前将这些域名转化为对应的IP地址，这里为了防止`dns-prefetch`阻塞页面渲染影响用户体验，Chrome浏览器的引擎并没有使用它的网络堆栈去进行预解析，而是单独开了8个完全异步的Worker线程专门负责DNS Prefetch。

#### 浏览器与系统DNS缓存时间

> TTL(Time-To-Live)，就是一条域名解析记录在DNS服务器中的存留时间

- **浏览器DNS缓存的时间跟DNS服务器返回的TTL值无关**, 它的缓存时间取决于浏览器自身设置，Chrome的过期时间是1分钟。
- **系统缓存会参考DNS服务器响应的TTL值，但是不完全等于TTL值**。国内和国际上很多平台的TTL值都是以秒为单位的，很多的默认值都是3600，也就是默认缓存1小时。



## prerender

prerender 是一个重量级的选项，它可以让浏览器提前加载指定页面的所有资源。

浏览器加载并渲染页面，设置页面状态为’prerender’（此时页面不可见），当用户真正访问时，浏览器变更页面的状态为’visible’，将其迅速呈现出来，页面秒速响应。

Steve Souders 的[文章](http://www.stevesouders.com/blog/2013/11/07/prebrowsing/)详细解释了这个技术：

> prerender 就像是在后台打开了一个隐藏的 tab，会下载所有的资源、创建 DOM、渲染页面、执行 JS 等等。如果用户进入指定的链接，隐藏的这个页面就会进入马上进入用户的视线。Google Search 多年前就利用了这个特性实现了 Instant Pages 功能。微软最近也宣布会让 Bing 在 IE11 上用类似 prerender 的技术。

> 注意： 渲染页面对浏览器而言是比较昂贵的操作，因此并不是所有情况下都会去做预渲染，当出现以下情况时，预处理将被中止。

- 当资源有限时，防止启动预渲染。
- 由于高成本或资源需求而放弃预渲染 - 例如高CPU或内存使用，昂贵的数据访问等等。
- 由于所获取内容的类型或属性而放弃预渲染：
- 如果目标表现出非幂等行为：共享本地存储的突变，带有除GET，HEAD或OPTION之外的动词的`XMLHttpRequest`，依此类推。
- 如果目标触发需要用户输入的条件：确认对话框，身份验证提示，警报等。

#### 用法

```html
<link rel="prerender"  href="/thenextpage.html" />
```

我们希望浏览器加载静态资源并渲染原始页面结构，但不希望在此时执行真正的业务代码，此外浏览器在预加载状态页会对一些操作进行限制（如变更存储状态localStorage等..），因此，最好的方式是将业务代码延迟到页面真正呈现时再执行。

监听 visibilitychange 事件，当页面可见状态由 prerender 变更为 visible 时，再对进行业务代码初始化。

```js
function init() {
    // 初始化vue实例
    new Vue({
        router,
        store,        
        render: h => h(App)
    }).$mount('#app');
}

function visibleChange() {
    // 页面状态从 prerender 变更为 visible ，再执行初始化
    if (document.visibilityState === 'visible') {
        init(); 
        document.removeEventListener('visibilitychange', visibleChange);
    }
}

// 监听页面状态变更
if (document.visibilityState === 'prerender') {
    document.addEventListener('visibilitychange', visibleChange);
} else {
    // 不经过prerender ,普通方式加载
    init();
}
```