#!/usr/bin/env node
 /*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";
var URL_DEFAULT = "http://serene-fjord-3265.herokuapp.com";
var rest = require('restler');
var sys = require('util');

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var cheerioHtmlFile = function(htmlfile) {
    return cheerio.load(fs.readFileSync(htmlfile));
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var checkHtmlFile = function(htmlfile, checksfile) {
    $ = cheerioHtmlFile(htmlfile);
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for(var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    return out;
};

var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

var checkHtml = function(html) {
    var checkJson = checkHtmlFile(html, program.checks);
    var outJson = JSON.stringify(checkJson, null, 4);
    console.log(outJson);
}

function download(url, callback) {
    var resp = rest.get(url);
    resp.on('complete', function(result) {
        if (result instanceof Error) {
            // callback(result);
            sys.puts('Error: ' + result.message);
            this.retry(5000); // try again after 5 sec
            return;
        }
        callback(null, result);
    });
}

if(require.main == module) {
    program
        .option('-f, --file <html_file>', 'Path to index.html', clone(assertFileExists), HTMLFILE_DEFAULT)
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
	.option('-u, --url <url_path>', 'Path to index.html url')
        .parse(process.argv);

    function check(err, html){
	if (err) {
	    console.log('Error getting html: ' + err);
	    process.exit(1);
	}

	var checks = loadChecks(program.checks);
        var checkJson = checkHtml(html, checks);
        var outJson = JSON.stringify(checkJson, null, 4);
        console.log(outJson);
    }

    if (program.url) {
        // download the provided url and then check the html
        // download(program.url, check);
	rest.get(program.url).on('complete', function(result) {
	    if (result instanceof Error) 
	    {
		sys.puts('Error: ' + result.message);
		this.retry(5000); // try again after 5 sec
	    }
	    else
	    {
		//sys.puts(result); // auto convert to object
		fs.writeFileSync('input.html', result);
		var checkJson = checkHtmlFile('input.html', program.checks);
		var outJson = JSON.stringify(checkJson, null, 4);
		console.log(outJson);
//		var checkJson = checkHtml(result);
	    }
	});
  } else if (program.file) {
        // load html from a file and then check it
        fs.readFile(program.file, check);
    }

/*    if (program.url != null) 
    {
      	rest.get(program.url).on('complete', function(result)
	{
            if (result instanceof Error)
	    {
		sys.puts('Error: ' + result.message);
	    }
	    else
	    {
		checkHtml((html instanceof Error), result);
	    }
	});
    }
    else
    {
	fs.readFile(program.file, checkHtml);
	//var checkJson = checkHtmlFile(program.file, program.checks);
	//var outJson = JSON.stringify(checkJson, null, 4);
	//console.log(outJson);
    }
*/

} else {
    exports.checkHtmlFile = checkHtmlFile;
}

