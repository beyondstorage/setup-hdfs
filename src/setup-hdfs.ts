import * as core from '@actions/core';
import {downloadTool, extractTar, cacheDir} from '@actions/tool-cache'
import {exec} from 'child_process';
import * as fs from 'fs';
import {promisify} from "util";

const writeFile = promisify(fs.writeFile);

async function setup() {
    // Fetch user input.
    const hdfsVersion = core.getInput('hdfs-version');

    // Full list here: http://www.apache.org/mirrors/
    //
    // TODO: maybe we need to support user provided download url.
    const hdfsUrl = `https://mirrors.gigenet.com/apache/hadoop/core/hadoop-${hdfsVersion}/hadoop-${hdfsVersion}.tar.gz`;

    // Download hdfs and extract.
    const hdfsTar = await downloadTool(hdfsUrl);
    const hdfsFolder = await extractTar(hdfsTar) + `/hadoop-${hdfsVersion}`;

    const coreSite = `<configuration>
    <property>
        <name>fs.defaultFS</name>
        <value>hdfs://localhost:9000</value>
    </property>
</configuration>`
    await writeFile(`${hdfsFolder}/etc/hadoop/core-site.xml`, coreSite);

    const hdfsSite = `<configuration>
    <property>
        <name>dfs.replication</name>
        <value>1</value>
    </property>
</configuration>`
    await writeFile(`${hdfsFolder}/etc/hadoop/hdfs-site.xml`, hdfsSite);

    const hdfsHome = await cacheDir(hdfsFolder, 'hdfs', hdfsVersion);

    // Start hdfs daemon.
    exec(`${hdfsHome}/bin/hdfs namenode -format`, (err: any, stdout: any, stderr: any) => {
        core.info(stdout);
        core.warning(stderr);
        if (err) {
            core.error('Error format hdfs namenode');
            throw new Error(err);
        }
    })
    exec(`${hdfsHome}/sbin/start-dfs.sh`, (err: any, stdout: any, stderr: any) => {
        core.info(stdout);
        core.warning(stderr);
        if (err) {
            core.error('Error start-dfs');
            throw new Error(err);
        }
    })
}

setup().catch((err) => {
    core.error(err);
    core.setFailed(err.message);
})

