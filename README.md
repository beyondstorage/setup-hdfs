This action sets up Apache Hadoop/HDFS in your environment for use in GitHub Actions.

## Usage

```yaml
steps:
  - uses: actions/setup-python@v2
    with:
      python-version: '3.8'
  - uses: actions/setup-java@v1
    with:
      java-version: '11'

  - uses: beyondstorage/setup-hdfs@master
    with:
      hdfs-version: '3.3.1'

  - run: curl ${{ env.HDFS_NAMENODE_ADDR }}
```

## Available versions

- "2.10.1"
- "3.2.3"
- "3.3.1"
- "3.3.2"

## Statement

This project highly inspired by:

- [setup-spark](https://github.com/vemonet/setup-spark)
- [setup-ipfs](https://github.com/ibnesayeed/setup-ipfs)

Thanks to [@vemonet](https://github.com/vemonet) and [@ibnesayeed](https://github.com/ibnesayeed).
