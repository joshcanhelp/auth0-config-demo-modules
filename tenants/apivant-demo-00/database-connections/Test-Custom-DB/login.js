function login(identifierValue, password, callback) {
  return callback(null, { 
    id: identifierValue,
    email: identifierValue
  });
}
