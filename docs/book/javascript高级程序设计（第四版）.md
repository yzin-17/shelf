# test

## 基础语法

### 模板字面量

#### 标签函数

```js
let a = 6; 
let b = 9; 
function simpleTag(strings, aValExpression, bValExpression, sumExpression) { 
 console.log(strings); // strings取所有插值的前后，如果插值前后无字符串，则是''
 console.log(aValExpression); 
 console.log(bValExpression); 
 console.log(sumExpression); 
 return 'foobar'; 
} 
let untaggedResult = `${ a } + ${ b } = ${ a + b }`; 
let taggedResult = simpleTag`${ a } + ${ b } = ${ a + b }`; 
// ["", " + ", " = ", ""] 
// 6 
// 9 
// 15 
console.log(untaggedResult); // "6 + 9 = 15" 
console.log(taggedResult); // "foobar" 
```

##### String.raw

String.raw可以直接获取转义前的模板字面量内容（如换行符或 Unicode 字符）

```js
console.log(`\u00A9`); // © 
console.log(String.raw`\u00A9`); // \u00A9

console.log(`first line\nsecond line`); 
// first line 
// second line 
console.log(String.raw`first line\nsecond line`); // "first line\nsecond line" 
// 对实际的换行符来说是不行的
// 它们不会被转换成转义序列的形式
console.log(String.raw`first line 
second line`); 
// first line 
// second line 

```

