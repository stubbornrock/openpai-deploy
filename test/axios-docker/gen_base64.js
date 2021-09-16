//const val="WyJkZWZhdWx0Il0=";
//const bb=Buffer.from(val, 'base64').toString();
//console.log(bb);
//
const val2="eyJhY2xzIjp7ImFkbWluIjpmYWxzZSwidmlydHVhbENsdXN0ZXJzIjpbXX19"
const bb2=Buffer.from(val2, 'base64').toString();
console.log(bb2);


//const grouplist="[\"default\",\"admingroup\"]"
const grouplist="{\"acls\":{\"admin\":true,\"virtualClusters\":[],\"storageConfigs\":[],\"groupAdmin\":[]}}"
const cc=Buffer.from(grouplist).toString('base64')
console.log(cc);

//const gl="[\"default\"]"
//const dd=Buffer.from(gl).toString('base64')
//console.log(dd);
