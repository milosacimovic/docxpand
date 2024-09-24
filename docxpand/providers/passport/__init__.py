from docxpand.providers import ChoiceProvider
from docxpand.translations.passport import (
    PASSPORT_OBSERVATIONS
)

class Provider(ChoiceProvider):

    def generate_observations(self, locale: str):
        observations = PASSPORT_OBSERVATIONS[self.choice()][locale]
        # Take a random observation from the list
        return self.random_choice(observations)

