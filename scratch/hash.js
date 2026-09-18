import bcrypt from 'bcrypt'
const hash = bcrypt.hashSync('12345678', 10)
console.log('HASH:', hash)
