import unittest
from unittest.mock import MagicMock, patch
from app.services.scraper_service import (
    CharacterData,
    NightlightScraperDriver,
    PerkData,
    ScraperService,
)


class TestNightlightScraperDriver(unittest.TestCase):
    def test_scraper_service_has_nightlight_driver(self):
        service = ScraperService()
        self.assertTrue(hasattr(service, 'nightlight_driver'))
        self.assertIsInstance(service.nightlight_driver, NightlightScraperDriver)

    def test_parse_survivors_and_killers_api(self):
        survivors_json = [
            {
                'id': 'dwight-fairfield',
                'name': 'Dwight Fairfield',
                'portrait': 'dwight.png',
                'role': 'survivor',
            }
        ]
        killers_json = {
            'data': [
                {
                    'id': 'trapper',
                    'name': 'The Trapper',
                    'portrait_url': 'https://cdn.nightlight.gg/img/portraits/trapper.png',
                    'role': 'killer',
                }
            ]
        }
        driver = NightlightScraperDriver()
        characters = driver.parse_api_characters(survivors_json, killers_json)
        self.assertEqual(len(characters), 2)

        dwight = next(c for c in characters if c.name == 'Dwight Fairfield')
        self.assertEqual(dwight.category, 'Survivor')
        self.assertTrue(dwight.avatar_url.startswith('https://cdn.nightlight.gg/img/portraits/'))

        trapper = next(c for c in characters if c.name == 'The Trapper')
        self.assertEqual(trapper.category, 'Killer')
        self.assertTrue(trapper.avatar_url.startswith('https://cdn.nightlight.gg/img/portraits/'))

    def test_parse_chunk_and_stream_perks(self):
        chunk_js = '''
        window.__NIGHTLIGHT_DATA__ = {
            perks: [
                {
                    name: 'Sprint Burst',
                    character: 'Meg Thomas',
                    role: 'survivor',
                    icon: 'sprint-burst'
                },
                {
                    name: "A Nurse's Calling",
                    character: 'The Nurse',
                    role: 'killer',
                    icon: 'nurses-calling.png'
                }
            ]
        };
        '''
        stream_payload = '''
        streamController.enqueue('<div data-perk="Sprint Burst"><p>Causes you to break into a sprint for 3 seconds.</p></div><div data-perk="A Nurse\\'s Calling"><p>Auras of Survivors who are healing are revealed to you.</p></div>');
        '''
        meg = CharacterData(
            name='Meg Thomas',
            real_name='Meg Thomas',
            wiki_slug='Meg_Thomas',
            short_name='meg',
            category='Survivor',
            avatar_url='https://cdn.nightlight.gg/img/portraits/meg.png',
            avatar_local_path='avatars/survivors/meg_thomas.png',
        )
        nurse = CharacterData(
            name='The Nurse',
            real_name='The Nurse',
            wiki_slug='The_Nurse',
            short_name='nurse',
            category='Killer',
            avatar_url='https://cdn.nightlight.gg/img/portraits/nurse.png',
            avatar_local_path='avatars/killers/the_nurse.png',
        )
        driver = NightlightScraperDriver()
        perks = driver.parse_nightlight_perks(chunk_js, stream_payload, characters=[meg, nurse])
        self.assertEqual(len(perks), 2)

        sprint_burst = next(p for p in perks if p.name == 'Sprint Burst')
        self.assertEqual(sprint_burst.category, 'Survivor')
        self.assertEqual(sprint_burst.character, 'Meg Thomas')
        self.assertTrue(sprint_burst.icon_url.startswith('https://cdn.nightlight.gg/img/perks/'))
        self.assertIn('sprint', sprint_burst.description.lower())

        nurses_calling = next(p for p in perks if p.name == "A Nurse's Calling")
        self.assertEqual(nurses_calling.category, 'Killer')
        self.assertEqual(nurses_calling.character, 'The Nurse')
        self.assertTrue(nurses_calling.icon_url.startswith('https://cdn.nightlight.gg/img/perks/'))
        self.assertIn('healing', nurses_calling.description.lower())

    @patch('app.services.scraper_service.requests.get')
    def test_fetch_nightlight_data_uses_curl_cffi(self, mock_get):
        mock_response = MagicMock()
        mock_response.text = '<html>test</html>'
        mock_get.return_value = mock_response

        driver = NightlightScraperDriver()
        res = driver.fetch_nightlight_data('https://nightlight.gg/test')

        self.assertEqual(res, '<html>test</html>')
        mock_get.assert_called_once_with(
            'https://nightlight.gg/test',
            headers=driver.HEADERS,
            impersonate='chrome120',
            verify=False,
            timeout=30,
        )


if __name__ == '__main__':
    unittest.main()