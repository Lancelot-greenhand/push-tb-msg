#!/usr/bin/env node
 // 引入index的实例， 传递参数，触发事件


const prog = require('caporal')
const app = require('../index')


prog.version('0.1.0')
    .description('ds')
    .action(function(args, options, logger) {
        let name = args.name
        app.emit('boot', name)
    })

prog.parse(process.argv)


// app.emit('tt', 'TT')