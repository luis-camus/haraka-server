from aiosmtpd.controller import Controller
import json
import asyncio

class PrintHandler:
    async def handle_RCPT(self, server, session, envelope, address, rcpt_options):
        envelope.rcpt_tos.append(address)
        return '250 OK'

    async def handle_DATA(self, server, session, envelope):
        print("=== Incoming Email ===")
        print(f"From: {envelope.mail_from}")
        print(f"To: {envelope.rcpt_tos}")
        print("Data:")
        print(envelope.content.decode('utf8', errors='replace'))
        print("======================")
        return '250 OK'

# fallback config
host = "localhost"
port = 2555

# load from smtp_config.json
try:
    with open("smtp_config.json") as f:
        cfg = json.load(f)
        host = cfg.get("host", "localhost")
        port = cfg.get("port", 2555)
except FileNotFoundError:
    pass

controller = Controller(PrintHandler(), hostname=host, port=port)
controller.start()

async def main():
    print(f"SMTP server running on {host}:{port}")
    try:
        while True:
            await asyncio.sleep(3600)
    except KeyboardInterrupt:
        controller.stop()

if __name__ == "__main__":
    asyncio.run(main())