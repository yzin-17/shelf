exports.groupName = "outbound-local";
exports.name = "outbound-local";
exports.rules = `localhost:3000/api/outbound-orders http://127.0.0.1:6000/api/outbound-orders
^localhost:3000/api/skus/*/available-warehouses http://127.0.0.1:6000/api/skus/$1/available-warehouses
`;
