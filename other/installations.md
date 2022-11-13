# Installations

The following includes commands for performing installations on an Linux/UNIX EC2 instance.

## Docker

```
# Update installed packages (optionally, but recommended)
sudo yum update -y

# Install Docker
sudo amazon-linux-extras install docker -y

# Start the Docker Deamon
sudo service docker start

# Add the user (ec2-user) to the Docker group (to be able to start Docker without `sudo` command)
sudo usermod -a -G docker ec2-user

# ensure that Docker service remains up and running after rebooting the AMI
sudo systemctl enable docker
```

> **Note:** In order for the docker command to work without `sudo`, the EC2 instance connect terminal might have to be closed and opened again.

## docker-compose

```
sudo curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose

sudo chmod +x /usr/local/bin/docker-compose
```

## git

```
sudo yum install git -y
```
