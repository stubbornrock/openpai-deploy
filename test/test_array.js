const desktops = [{name:'aa',username:'chengs01'},{name:'bb',username:'chengs02'},{name:'cc',username:'chengs03'}]
let usernames = []
desktops.forEach(item => usernames.push(item.username));

usernames.includes("chengs02") ? console.log("ok"):console.log("fail");
