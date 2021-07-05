import * as core from '@actions/core';
import {exec} from 'child_process';
import * as fs from 'fs';


function setup() {
    const hdfsVersion = core.getInput('hdfs-version');

    let installFolder: any = process.env.GITHUB_WORKSPACE + '/../'
    fs.access(installFolder, fs.constants.W_OK, (err) => {
        console.log('$GITHUB_WORKSPACE parent not writable. Using $GITHUB_WORKSPACE to store hdfs');
        installFolder = process.env.GITHUB_WORKSPACE
    });

    // Full list here: http://www.apache.org/mirrors/
    //
    // TODO: maybe we need to support user provided download url.
    const hdfsUrl = `https://mirrors.gigenet.com/apache/hadoop/core/hadoop-${hdfsVersion}/hadoop-${hdfsVersion}.tar.gz`;

    // Download and setup hadoop.
    let command = `cd /tmp &&
  wget -q -O hdfs.tgz ${hdfsUrl} &&
  tar xzf hdfs.tgz -C ${installFolder} &&
  rm "hdfs.tgz"
  ln -s "${installFolder}/hadoop-${hdfsVersion}" ${installFolder}/hdfs`

    exec(command, (err: any, stdout: any, stderr: any) => {
        if (err || stderr) {
            console.log('Error downloading the Spark binary');
            throw new Error(err);
        }
    });

    // Configure hdfs.
    const hdfsHome = installFolder + '/hdfs';

    const coreSite = `<configuration>
    <property>
        <name>fs.defaultFS</name>
        <value>hdfs://localhost:9000</value>
    </property>
</configuration>`
    exec(`echo ${coreSite} > ${hdfsHome}/etc/hadoop/core-site.xml`, (err: any, stdout: any, stderr: any) => {
        if (err || stderr) {
            console.log('Error setup core-site.xml');
            throw new Error(err);
        }
    })
    const hdfsSite = `<configuration>
    <property>
        <name>dfs.replication</name>
        <value>1</value>
    </property>
</configuration>`
    exec(`echo ${hdfsSite} > ${hdfsHome}/etc/hadoop/hdfs-site.xml`, (err: any, stdout: any, stderr: any) => {
        if (err || stderr) {
            console.log('Error setup hdfs-site.xml');
            throw new Error(err);
        }
    })

    exec(`tree ${hdfsHome}`, (err: any, stdout: any, stderr: any) => {
        if (err || stderr) {
            console.log('Error tree');
            throw new Error(err);
        }
    })

    // Start hdfs daemon.
    exec(`${hdfsHome}/bin/hdfs namenode -format`, (err: any, stdout: any, stderr: any) => {
        if (err || stderr) {
            console.log('Error format hdfs namenode');
            throw new Error(err);
        }
    })
    exec(`${hdfsHome}/sbin/start-dfs.sh`, (err: any, stdout: any, stderr: any) => {
        if (err || stderr) {
            console.log('Error start-dfs');
            throw new Error(err);
        }
    })
}

try {
    setup()
} catch (error) {
    console.log(error);
    core.setFailed(error.message);
}
