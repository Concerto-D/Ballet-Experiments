# Need to be run in a ROOT SESSION (so on a node with sudo-g5k activated)
# Need to be run in the pulumi-mjuz github repo
# CF: 
# - https://github.com/mjuz-iac/pulumi/blob/mjuz/CONTRIBUTING.md for dependencies
# - https://github.com/mjuz-iac/pulumi/blob/mjuz/Dockerfile for installation

source /home/anomond/.bashrc

# Dependencies
## Go
wget https://go.dev/dl/go1.16.15.linux-amd64.tar.gz
tar -xvf go1.16.15.linux-amd64.tar.gz
export PATH=$PATH:/home/anomond/pulumi-mjuz/go/bin

## nodejs
wget https://nodejs.org/dist/v18.12.0/node-v18.12.0-linux-x64.tar.xz
tar -xvf node-v18.12.0-linux-x64.tar.xz
export PATH=$PATH:/home/anomond/pulumi-mjuz/node-v18.12.0-linux-x64/bin

## dotnet
wget https://dot.net/v1/dotnet-install.sh
chmod 700 dotnet-install.sh
./dotnet-install.sh -c Current --runtime aspnetcore
export PATH=$PATH:/home/anomond/.dotnet

## pipenv
pyenv local 3.8.14
pip install pipenv

## yarn ts-node
npm install -g yarn ts-node

source /home/anomond/.bashrc

make install
cd sdk/nodejs

# FIXES
## Set exact dependencies
sed -i 's/\^//g' package.json
sed -i 's/\~//g' package.json

## TODO NOT INVESTIGATED BUG: temporary as long as no other fix, can have UNDESIRED SIDE EFFECTS but is necessary to make build
sed -i 's/fs.rmdir(path.dirname(logFile), { recursive: true }, () => { return; });/fs.rmdir(path.dirname(logFile), () => { return; });/' automation/stack.ts

yarn && make build && make install

## Copy install binaries in shared homedir
cp -r /opt/pulumi/ /home/anomond/pulumi-mjuz/

### Set pulumi path
#echo 'export PATH=$PATH:/home/anomond/pulumi-mjuz/pulumi:/home/anomond/pulumi-mjuz/pulumi/bin' >> /home/anomond/.bashrc
#
## Set env vars pulumi-mjuz
#export PULUMI_SKIP_UPDATE_CHECK=1
#export PULUMI_AUTOMATION_API_SKIP_VERSION_CHECK=0
#export PULUMI_CONFIG_PASSPHRASE=0000

