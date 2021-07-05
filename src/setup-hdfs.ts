import * as core from '@actions/core';
import {downloadTool, extractTar, cacheDir} from '@actions/tool-cache'
import {exec} from 'child_process';
import * as fs from 'fs';

async function setup() {
    const hdfsVersion = core.getInput('hdfs-version');

    let installFolder: any = process.env.GITHUB_WORKSPACE + '/../'

    fs.access(installFolder, fs.constants.W_OK, (err) => {
        core.info('$GITHUB_WORKSPACE parent not writable. Using $GITHUB_WORKSPACE to store hdfs');
        installFolder = process.env.GITHUB_WORKSPACE
    });

    // Full list here: http://www.apache.org/mirrors/
    //
    // TODO: maybe we need to support user provided download url.
    const hdfsUrl = `https://mirrors.gigenet.com/apache/hadoop/core/hadoop-${hdfsVersion}/hadoop-${hdfsVersion}.tar.gz`;

    // Download hdfs and extract.
    const hdfsTar = await downloadTool(hdfsUrl);
    const hdfsExtractedFolder = await extractTar(hdfsTar);
    const hdfsHome = await cacheDir(hdfsExtractedFolder, 'hdfs', hdfsVersion);

    const coreSite = `<configuration>
    <property>
        <name>fs.defaultFS</name>
        <value>hdfs://localhost:9000</value>
    </property>
</configuration>`
    fs.writeFile(`${hdfsHome}/etc/hadoop/core-site.xml`, coreSite, (err) => {
        if (err) {
            core.error(err);
            throw err;
        }
    })

    const hdfsSite = `<configuration>
    <property>
        <name>dfs.replication</name>
        <value>1</value>
    </property>
</configuration>`
    fs.writeFile(`${hdfsHome}/etc/hadoop/hdfs-site.xml`, hdfsSite, (err) => {
        if (err) {
            core.error(err);
            throw err;
        }
    })


    exec(`tree ${hdfsHome}`, (err: any, stdout: any, stderr: any) => {
        core.debug(stdout);
        if (err || stderr) {
            core.error('Error tree');
            throw new Error(err);
        }
    })

    // Start hdfs daemon.
    exec(`${hdfsHome}/bin/hdfs namenode -format`, (err: any, stdout: any, stderr: any) => {
        core.debug(stdout);
        if (err || stderr) {
            core.error(stderr);
            core.error('Error format hdfs namenode');
            throw new Error(err);
        }
    })
    exec(`${hdfsHome}/sbin/start-dfs.sh`, (err: any, stdout: any, stderr: any) => {
        core.debug(stdout);
        if (err || stderr) {
            core.error(stderr);
            core.error('Error start-dfs');
            throw new Error(err);
        }
    })
}


setup().catch((err) => {
    core.error(err);
    core.setFailed(err.message);
})

