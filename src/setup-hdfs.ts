import * as core from '@actions/core';
import {downloadTool, extractTar, cacheDir} from '@actions/tool-cache';
import {exec} from 'child_process';
import * as fs from 'fs';
import {promisify} from 'util';

const writeFile = promisify(fs.writeFile);

async function setup() {
  // Fetch user input.
  const hdfsVersion = core.getInput('hdfs-version');

  const hdfsUrl = `https://dlcdn.apache.org/hadoop/common/hadoop-${hdfsVersion}/hadoop-${hdfsVersion}.tar.gz`;

  // Download hdfs and extract.
  const hdfsTar = await downloadTool(hdfsUrl);
  const hdfsFolder = (await extractTar(hdfsTar)) + `/hadoop-${hdfsVersion}`;

  const coreSite = `<configuration>
    <property>
        <name>fs.defaultFS</name>
        <value>hdfs://localhost:9000</value>
    </property>
</configuration>`;
  await writeFile(`${hdfsFolder}/etc/hadoop/core-site.xml`, coreSite);

  const hdfsSite = `<configuration>
    <property>
        <name>dfs.replication</name>
        <value>1</value>
    </property>
    <property>
        <name>dfs.secondary.http.address</name>
        <value>localhost:9100</value>
    </property>
</configuration>`;
  await writeFile(`${hdfsFolder}/etc/hadoop/hdfs-site.xml`, hdfsSite);

  const hdfsHome = await cacheDir(hdfsFolder, 'hdfs', hdfsVersion);

  // Setup self ssh connection.
  // Fix permission issues: https://github.community/t/ssh-test-using-github-action/166717/12
  const cmd = `chmod g-w $HOME                  &&
chmod o-w $HOME                                 &&
ssh-keygen -t rsa -P '' -f ~/.ssh/id_rsa        &&
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys &&
chmod 0600 ~/.ssh/authorized_keys               &&
ssh-keyscan -H localhost >> ~/.ssh/known_hosts  &&
chmod 0600 ~/.ssh/known_hosts                   &&
eval \`ssh-agent\`                              &&
ssh-add ~/.ssh/id_rsa
`;
  exec(cmd, (err: any, stdout: any, stderr: any) => {
    core.info(stdout);
    core.warning(stderr);
    if (err) {
      core.error('Setup self ssh failed');
      throw new Error(err);
    }
  });

  // Stop all before start to avoid flaky error
  exec(
    `bash ${hdfsHome}/sbin/stop-all.sh`,
    (err: any, stdout: any, stderr: any) => {
      core.info(stdout);
      core.warning(stderr);
      if (err) {
        core.error('Stop all failed');
        throw new Error(err);
      }
    }
  );

  // Start hdfs daemon.
  exec(
    `${hdfsHome}/bin/hdfs namenode -format`,
    (err: any, stdout: any, stderr: any) => {
      core.info(stdout);
      core.warning(stderr);
      if (err) {
        core.error('Format hdfs namenode failed');
        throw new Error(err);
      }
    }
  );

  exec(
    `${hdfsHome}/sbin/start-dfs.sh`,
    (err: any, stdout: any, stderr: any) => {
      core.info(stdout);
      core.warning(stderr);
      if (err) {
        core.error('Call start-dfs failed');
        throw new Error(err);
      }
    }
  );

  core.addPath(`${hdfsHome}/bin`);
  core.exportVariable('HDFS_NAMENODE_ADDR', '127.0.0.1:9000');
  core.exportVariable('HADOOP_HOME', hdfsHome);
}

setup().catch(err => {
  core.error(err);
  core.setFailed(err.message);
});
