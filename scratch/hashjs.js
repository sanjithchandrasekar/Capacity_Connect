import bcrypt from 'bcryptjs'
const hash = bcrypt.hashSync('12345678', 10)
console.log('HASH:', hash)
