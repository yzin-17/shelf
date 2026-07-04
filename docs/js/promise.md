-   如果`resolve`中传入的是另外一个`Promise`，那么这个新`Promise`会决定原`Promise`的状态

```javascript
const promise = new Promise((resolve, reject) => {
  resolve(new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve('ice')
    }, 3000);
  }))
})

promise.then(res => console.log(res))

//3s后 ice
```
-   如果`resolve`中传入的是一个对象，并且这个对象有实现`then`方法，那么会执行该`then`方法，`then`方法会传入`resolve`，`reject`函数。此时的`promise`状态取决于你调用了`resolve`，还是`reject`函数。这种模式也称之为: **thenable**

```javascript
const promise = new Promise((resolve, reject) => {
  resolve({
    then(res, rej) {
      res('hi ice')
    }
  })
})

promise.then(res => console.log(res))

// hi ice
```
