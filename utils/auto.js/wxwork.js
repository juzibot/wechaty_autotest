"auto";
device.wakeUp();
// launch("com.tencent.mm");
launch("com.tencent.wework");
setScreenMetrics(1080, 1920);
id('hxm').waitFor();
id('hxm').findOne().click();
sleep(500);
while (!click("扫一扫"));
sleep(1000)
while (!click("相册"));
// className("android.widget.LinearLayout").depth(1).watiFor()
// id("fah").findOne().click();
sleep(1000);
while (!click(500, 250));
sleep(500);
text('确定').findOne().click();
sleep(3000);
if (text('登录').exists()) {
  text('登录').findOne().click();
  sleep(1000);
  if (text('确定').exists()){
    text('确定').findOne().click();
    sleep(500);
  }
} else {
  id('hxb').findOne().click();
  sleep(300);
}
exit();
