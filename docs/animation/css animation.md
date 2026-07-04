1. `transition`对`display`从`none`转到其他的节点无效
   解决方法：

   - 方法一：先改变节点`display`，`setTimeout(0)`后再改变style

   - 方法二：使用animation、@keyframes

2. transform限制position:fixed的跟随效果

   父元素加了`transform`后，`fixed`元素，变成`absolute`一样的行为表现

   [CSS3 transform对普通元素的N多渲染影响 « 张鑫旭-鑫空间-鑫生活 (zhangxinxu.com)](https://www.zhangxinxu.com/wordpress/2015/05/css3-transform-affect/)

