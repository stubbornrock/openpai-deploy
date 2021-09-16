const axios = require('axios')
const hivedWebserviceUri='http://192.168.21.236:30096'

let items = [];

const _get_startIndex = () => {
    return items.length
}

const _prasePC = async (pc, level) => {
  pc['key'] = `${pc.cellType}`;
  pc['name'] = `${pc.cellType}`;
  pc['level'] = level + 1;
  pc['count'] = 0;
  pc['startIndex'] = _get_startIndex();
  if (pc.cellChildren !== undefined && pc.cellChildren.length !== 0) {
    pc['children'] = pc.cellChildren;
    pc.cellChildren.forEach((cell) => {
      _prasePC(cell, level+1);
      pc['count'] = pc['count'] + cell['count'];
    });
  } else {
    pc['count'] = 1;
    items.push(pc);
  }
}

const prasePCs = async () => {
  let vcStatus;
  vcStatus = (
    await axios.get(`${hivedWebserviceUri}/v1/inspect/clusterstatus`,)
  ).data;
  let pcs = vcStatus.physicalCluster;
  pcs.forEach((pc) => {
    _prasePC(pc, 0);
  });
  console.log(pcs);
};
prasePCs()
